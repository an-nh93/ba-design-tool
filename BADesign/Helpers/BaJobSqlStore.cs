using System;
using System.Collections.Generic;
using System.Data.SqlClient;

namespace BADesign.Helpers
{
    public sealed class BaJobSqlStore : IBaJobStore
    {
        private const int InvalidColumnName = 207;

        private const string ClaimSql = @"
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @lock INT;
EXEC @lock = sys.sp_getapplock @Resource = N'BADesign.BaJob.Claim', @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = 10000;
IF @lock >= 0
BEGIN
    ;WITH next AS (
        SELECT TOP (1) j.Id, j.JobType, j.Status, j.RunnerId, j.HeartbeatAt, j.SessionId
        FROM dbo.BaJob j WITH (UPDLOCK, ROWLOCK)
        WHERE j.Status = N'Pending'
          AND ISNULL(j.QueueName, N'') = @queue
          AND j.JobType IN ({types})
          AND NOT EXISTS (
              SELECT 1 FROM dbo.BaJob r
              WHERE r.Status = N'Running' AND r.JobType = j.JobType AND r.Id <> j.Id
                AND ISNULL(r.ServerName, N'') = ISNULL(j.ServerName, N'')
                AND ISNULL(r.DatabaseName, N'') = ISNULL(j.DatabaseName, N''))
        ORDER BY j.Id
    )
    UPDATE next
    SET Status = N'Running',
        RunnerId = @runner,
        HeartbeatAt = SYSDATETIME(),
        SessionId = CASE WHEN JobType = N'Restore' THEN -Id ELSE SessionId END
    OUTPUT INSERTED.Id, INSERTED.JobType;
END
COMMIT TRANSACTION;";

        private const string FailSet = "SET Status = N'Failed', Message = @msg, PercentComplete = 100, CompletedAt = SYSDATETIME() OUTPUT INSERTED.Id, INSERTED.JobType, INSERTED.ServerId, INSERTED.StartedByUserId";

        private readonly string _connectionString;

        public BaJobSqlStore(string connectionString)
        {
            _connectionString = connectionString;
        }

        public BaClaimedJob ClaimNext(string queueName, string runnerId, ICollection<string> jobTypes)
        {
            if (jobTypes == null || jobTypes.Count == 0) return null;
            return Run(cmd =>
            {
                var names = new List<string>();
                foreach (var type in jobTypes)
                {
                    var name = "@t" + names.Count;
                    names.Add(name);
                    cmd.Parameters.AddWithValue(name, type);
                }
                cmd.CommandText = ClaimSql.Replace("{types}", string.Join(", ", names));
                cmd.Parameters.AddWithValue("@queue", queueName ?? "");
                cmd.Parameters.AddWithValue("@runner", runnerId);
                using (var reader = cmd.ExecuteReader())
                {
                    if (!reader.Read()) return null;
                    return new BaClaimedJob { Id = reader.GetInt32(0), JobType = reader.IsDBNull(1) ? null : reader.GetString(1) };
                }
            });
        }

        public void Heartbeat(string runnerId)
        {
            Run(cmd =>
            {
                cmd.CommandText = "UPDATE dbo.BaJob SET HeartbeatAt = SYSDATETIME() WHERE Status = N'Running' AND RunnerId = @runner";
                cmd.Parameters.AddWithValue("@runner", runnerId);
                return cmd.ExecuteNonQuery();
            });
        }

        public IList<BaJobEnded> InterruptOrphans(string queueName, string runnerId, TimeSpan staleAfter, string message)
        {
            return Run(cmd =>
            {
                cmd.CommandText = "UPDATE dbo.BaJob " + FailSet
                    + " WHERE Status = N'Running' AND RunnerId IS NOT NULL AND RunnerId <> @runner AND ISNULL(QueueName, N'') = @queue"
                    + " AND ISNULL(HeartbeatAt, StartTime) < DATEADD(SECOND, -@stale, SYSDATETIME())";
                cmd.Parameters.AddWithValue("@msg", message);
                cmd.Parameters.AddWithValue("@runner", runnerId);
                cmd.Parameters.AddWithValue("@queue", queueName ?? "");
                cmd.Parameters.AddWithValue("@stale", (int)Math.Max(1, staleAfter.TotalSeconds));
                return ReadEnded(cmd);
            });
        }

        public IList<BaJobEnded> InterruptOwn(string runnerId, string message)
        {
            return Run(cmd =>
            {
                cmd.CommandText = "UPDATE dbo.BaJob " + FailSet + " WHERE Status = N'Running' AND RunnerId = @runner";
                cmd.Parameters.AddWithValue("@msg", message);
                cmd.Parameters.AddWithValue("@runner", runnerId);
                return ReadEnded(cmd);
            });
        }

        public BaJobEnded MarkFailed(int jobId, string message)
        {
            return Run(cmd =>
            {
                cmd.CommandText = "UPDATE dbo.BaJob " + FailSet + " WHERE Id = @id AND Status IN (N'Pending', N'Running')";
                cmd.Parameters.AddWithValue("@msg", (object)message ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@id", jobId);
                var ended = ReadEnded(cmd);
                return ended.Count > 0 ? ended[0] : null;
            });
        }

        public BaJobEnded CloseIfStillRunning(int jobId, string runnerId, string message)
        {
            return Run(cmd =>
            {
                cmd.CommandText = "UPDATE dbo.BaJob " + FailSet + " WHERE Id = @id AND Status = N'Running' AND RunnerId = @runner";
                cmd.Parameters.AddWithValue("@msg", message);
                cmd.Parameters.AddWithValue("@id", jobId);
                cmd.Parameters.AddWithValue("@runner", runnerId);
                var ended = ReadEnded(cmd);
                return ended.Count > 0 ? ended[0] : null;
            });
        }

        public bool Track(int jobId, string queueName, string runnerId)
        {
            return Run(cmd =>
            {
                cmd.CommandText = "UPDATE dbo.BaJob SET QueueName = @queue, RunnerId = @runner, HeartbeatAt = SYSDATETIME() WHERE Id = @id AND Status = N'Running'";
                cmd.Parameters.AddWithValue("@queue", (object)queueName ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@runner", runnerId);
                cmd.Parameters.AddWithValue("@id", jobId);
                return cmd.ExecuteNonQuery() > 0;
            });
        }

        private static IList<BaJobEnded> ReadEnded(SqlCommand cmd)
        {
            var list = new List<BaJobEnded>();
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    list.Add(new BaJobEnded
                    {
                        Id = reader.GetInt32(0),
                        JobType = reader.IsDBNull(1) ? null : reader.GetString(1),
                        ServerId = reader.IsDBNull(2) ? (int?)null : reader.GetInt32(2),
                        UserId = reader.IsDBNull(3) ? (int?)null : reader.GetInt32(3)
                    });
                }
            }
            return list;
        }

        private T Run<T>(Func<SqlCommand, T> body)
        {
            try
            {
                using (var conn = new SqlConnection(_connectionString))
                using (var cmd = conn.CreateCommand())
                {
                    conn.Open();
                    return body(cmd);
                }
            }
            catch (SqlException ex) when (ex.Number == InvalidColumnName)
            {
                throw new InvalidOperationException("Bảng BaJob thiếu cột của bộ chạy job: hãy chạy Scripts/AddBaJobRunner.sql. " + ex.Message, ex);
            }
        }
    }
}
