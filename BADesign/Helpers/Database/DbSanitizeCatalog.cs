using System;
using System.Collections.Generic;

namespace BADesign.Helpers.Database
{
    public enum DbBlankMode
    {
        All,
        CipherOnly
    }

    public sealed class DbEncryptedColumns
    {
        public DbEncryptedColumns(string table, DbBlankMode mode, params string[] columns)
        {
            Table = table;
            Mode = mode;
            Columns = columns ?? new string[0];
        }

        public string Table { get; private set; }
        public DbBlankMode Mode { get; private set; }
        public string[] Columns { get; private set; }
        public string Filter { get; private set; }
        public string Replacement { get; private set; }

        public DbEncryptedColumns Where(string filter)
        {
            Filter = filter;
            return this;
        }

        public DbEncryptedColumns ReplaceWith(string replacement)
        {
            Replacement = replacement;
            return this;
        }
    }

    public sealed class DbDynamicEncryptedTables
    {
        public DbDynamicEncryptedTables(string likePattern, params string[] columns)
        {
            LikePattern = likePattern;
            Columns = columns ?? new string[0];
        }

        public string LikePattern { get; private set; }
        public string[] Columns { get; private set; }

        public bool AllStringColumns
        {
            get { return Columns.Length == 0; }
        }
    }

    public sealed class DbEmployeeContactTable
    {
        public DbEmployeeContactTable(string table, string employeeKeyColumn, string[] emailColumns, string[] phoneColumns)
        {
            Table = table;
            EmployeeKeyColumn = employeeKeyColumn;
            EmailColumns = emailColumns ?? new string[0];
            PhoneColumns = phoneColumns ?? new string[0];
        }

        public string Table { get; private set; }
        public string EmployeeKeyColumn { get; private set; }
        public string[] EmailColumns { get; private set; }
        public string[] PhoneColumns { get; private set; }
    }

    public sealed class DbEmployeeColumn
    {
        public DbEmployeeColumn(string table, string employeeKeyColumn, string column)
        {
            Table = table;
            EmployeeKeyColumn = employeeKeyColumn;
            Column = column;
        }

        public string Table { get; private set; }
        public string EmployeeKeyColumn { get; private set; }
        public string Column { get; private set; }
    }

    public sealed class DbEmployeeListColumn
    {
        public DbEmployeeListColumn(string table, string employeeKeyColumn, string column, bool fakeSalary)
        {
            Table = table;
            EmployeeKeyColumn = employeeKeyColumn;
            Column = column;
            FakeSalary = fakeSalary;
        }

        public string Table { get; private set; }
        public string EmployeeKeyColumn { get; private set; }
        public string Column { get; private set; }
        public bool FakeSalary { get; private set; }
    }

    public static class DbSanitizeCatalog
    {
        public const string Schema = "dbo";
        public const string EmployeeTable = "Staffing_Employees";
        public const string UserTable = "Security_Users";
        public const string EmailServerTable = "Setting_EmailServers";
        public const string FolderConfigurationTable = "Setting_FolderConfigurations";

        private static readonly string[] EmployeeEmails = { "PersonalEmailAddress", "BusinessEmailAddress" };
        private static readonly string[] EmployeePhones = { "MobilePhone1", "MobilePhone2", "HomePhone1", "HomePhone2" };

        public static readonly DbEmployeeContactTable[] EmployeeContactTables =
        {
            new DbEmployeeContactTable("Staffing_Employees", "ID", EmployeeEmails, EmployeePhones),
            new DbEmployeeContactTable("Staffing_EmployeeInformations", "EmployeeID", EmployeeEmails, EmployeePhones),
            new DbEmployeeContactTable("ESS_EmployeeProfileContactInformations", "EmployeeID", EmployeeEmails, EmployeePhones),
            new DbEmployeeContactTable("Staffing_EmployeeRelationships", "EmployeeID", new string[0], new[] { "MobilePhone" })
        };

        public static readonly DbEmployeeColumn PayslipPassword = new DbEmployeeColumn("Staffing_Employees", "ID", "PayslipPassword");

        public static readonly DbEmployeeColumn[] SalaryColumns =
        {
            new DbEmployeeColumn("Staffing_Transactions", "EmployeeID", "BasicSalary"),
            new DbEmployeeColumn("Staffing_TransactionRequests", "EmployeeID", "BasicSalary"),
            new DbEmployeeColumn("Staffing_TransactionExportDatas", "EmployeeID", "BasicSalary")
        };

        public const string ListSeparator = "{{|}}";

        public static readonly DbEmployeeListColumn[] EmployeeListColumns =
        {
            new DbEmployeeListColumn("SET_EmployeeTransactionHistories", "EmployeeID", "BasicSalary", true),
            new DbEmployeeListColumn("SET_EmployeeTransactionHistories", "EmployeeID", "PreBasicSalary", true),
            new DbEmployeeListColumn("SET_EmployeeTransactionHistories", "EmployeeID", "AllowanceValue", false),
            new DbEmployeeListColumn("SET_EmployeeTransactionHistories", "EmployeeID", "EfficiencyAllowance", false),
            new DbEmployeeListColumn("SET_EmployeeTransactionHistories", "EmployeeID", "PreEfficiencyAllowance", false)
        };

        public static readonly string[] UserSsoIdentifierColumns =
        {
            "AzureADIdentifier", "OktaIdentifier", "GoogleIdentifier", "GeneralOidcIdentifier", "LocalADIdentifier"
        };

        public static readonly string[] UserSignatureColumns =
        {
            "UserSignature", "GeneralCalcSignature", "GeneralOidcSignature"
        };

        public static readonly string[] UserMfaEmailColumns = { "EmailReceiveMfa", "EmailReceiveMfaTemp" };

        public static readonly string[] UserMfaSecretColumns = { "MfaPINSendToEmail" };

        public static readonly DbEncryptedColumns[] AmountColumns =
        {
            new DbEncryptedColumns("Staffing_EmployeeAllowances", DbBlankMode.All, "Amount"),
            new DbEncryptedColumns("Staffing_EmployeeAllowanceRequests", DbBlankMode.All, "Amount"),
            new DbEncryptedColumns("Staffing_EmployeeWorkingExperiences", DbBlankMode.All, "Salary"),
            new DbEncryptedColumns("ESS_EmployeeWorkingExperiences", DbBlankMode.All, "Salary"),
            new DbEncryptedColumns("Staffing_VNMStatutoryEmploymentIncomeCommitments", DbBlankMode.All, "IncomeCommitment"),
            new DbEncryptedColumns("REC_CandidateWorkingCompanies", DbBlankMode.All, "Salary"),
            new DbEncryptedColumns("REC_CandidateOffers", DbBlankMode.CipherOnly, "BasicSalary"),
            new DbEncryptedColumns("BEN_ExpenseClaimDetails", DbBlankMode.All, "Amount", "BeforeGSTVATAmount", "GSTVATAmount"),
            new DbEncryptedColumns("BEN_ExpenseClaimDetailDrafts", DbBlankMode.All, "Amount"),
            new DbEncryptedColumns("DashBoard_EmployeePayrolls", DbBlankMode.All, "Salary", "OtherIncomes", "OvertimePay", "TaxPaidbytheCompany", "StatutoryContribution"),
            new DbEncryptedColumns("PAY_EmployeeSalaries", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeSalaryDetails", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeSalaryWithholdings", DbBlankMode.CipherOnly, "Salary"),
            new DbEncryptedColumns("PAY_MasterEmployeeSalaryDetails", DbBlankMode.All, "JsonSalary")
                .Where("T.[JsonSalary] <> N'[]'").ReplaceWith("[]"),
            new DbEncryptedColumns("PAY_EmployeePaymentParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeAllowanceParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmpAdhAllowanceParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmpRecAllowanceParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmpRecAllowanceRetros", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeTaxFXAllowanceParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmpTaxFxAdhAllowanceParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmpTaxFXRecAllowanceParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmpTaxFXRecAllowanceRetros", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeTaxItemParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeAccTaxItemParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeEffectDateParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeEffectDateParameterRetros", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeePaymentParameterRetros", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeCurrencyExchangeRateParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_IDNEmployeeCurrencyTaxExchangeRateParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeIncomeTypeParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeDisciplineActionTakenParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeRewardMethodParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_PreviousEmpIncomeAllowanceParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeBonuses", DbBlankMode.CipherOnly, "Value", "AdjustedValue"),
            new DbEncryptedColumns("PAY_EmployeeBonusParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeSVCs", DbBlankMode.CipherOnly, "Value", "AdjustedValue"),
            new DbEncryptedColumns("PAY_CompanyPaymentParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_EmployeeRetroSalaries", DbBlankMode.CipherOnly, "OldValue", "NewValue", "DifferenceValue"),
            new DbEncryptedColumns("PAY_EmployeeRetroSalaryDetails", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_Allowances", DbBlankMode.CipherOnly, "Amount"),
            new DbEncryptedColumns("PAY_FinalPITs", DbBlankMode.CipherOnly,
                "TotalPersonalDeduction", "TotalGrossCompensationIncome", "TotalAccessibleIncome", "TotalTaxableIncome",
                "TotalDependentDeduction", "TotalStatutoryDeduction", "TotalInsuranceDeduction", "TotalCharitable",
                "TotalVoluntaryPensionFunds", "TotalExemption", "TotalPITPayable", "TotalPITWithholding",
                "TotalPITFinalization", "TaxOverpaid", "TaxUnderpaid", "TotalTaxableIncomeCompanyFirst",
                "TotalPITWithheldCompanyFirst", "TotalNonTaxableIncome", "TotalNetTaxableIncome", "TotalTaxDue",
                "TotalTaxWithheld", "TotalIncomeTaxRefund", "TotalCollectibleTaxDue"),
            new DbEncryptedColumns("PAY_FinalPITDetails", DbBlankMode.CipherOnly,
                "TaxableIncome", "DependentDeduction", "PersonalDeduction", "InsuranceDeduction", "Charitable",
                "VoluntaryPensionFunds", "AccessibleIncome", "PITPayable", "PITWithheld"),
            new DbEncryptedColumns("PAY_FinalPITOfYears", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_FinalPITOfMonths", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_FinalPITOtherIncomes", DbBlankMode.CipherOnly, "Value", "CalculateValue"),
            new DbEncryptedColumns("PAY_FinalPITNoneTaxIncomes", DbBlankMode.CipherOnly, "Value", "NoneTaxIncome"),
            new DbEncryptedColumns("PAY_FinalPITHistorySalaries", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_THAEmployeeTaxYears", DbBlankMode.CipherOnly,
                "TotalTaxPayable", "TotalTaxWithholding", "TotalOverpaidTax", "TotalUnderpaidTax", "TotalTaxFinalization"),
            new DbEncryptedColumns("PAY_THAEmployeeTaxDetails", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_THAEmployeeTaxDeductions", DbBlankMode.CipherOnly, "DeclareAmount"),
            new DbEncryptedColumns("PAY_THAEmployeeTaxDeductionHistories", DbBlankMode.CipherOnly, "DeclareAmount"),
            new DbEncryptedColumns("ESS_THAEmployeeTaxDeductions", DbBlankMode.CipherOnly, "DeclareAmount"),
            new DbEncryptedColumns("PAY_MMREmployeeTaxYears", DbBlankMode.CipherOnly,
                "AnnualIncome", "TotalStatutoryDeduction", "TotalAccessibleIncome", "TotalTaxPayable",
                "TotalTaxWithholding", "TotalTaxFinalization"),
            new DbEncryptedColumns("PAY_MMREmployeeTaxDetails", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_IDNEmployeeTaxDetails", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_IDNEmployeeTaxYears", DbBlankMode.CipherOnly,
                "TotalTaxPayable", "TotalTaxWithholding", "TotalTaxFinalization"),
            new DbEncryptedColumns("PAY_THAEmployeeOtherIncomes", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_IDNEmployeeOtherIncomes", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_MMREmployeeOtherIncomes", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_PHPEmployeeTaxDetails", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_PHPOffCycleEmployeeTaxDetails", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("PAY_MYSEmployeeDeductionDetails", DbBlankMode.CipherOnly,
                "MonthlyTaxPCB", "DeductionAmount", "RemainingAmount"),
            new DbEncryptedColumns("PAY_MYSEmployeeDeductions", DbBlankMode.CipherOnly, "Amount"),
            new DbEncryptedColumns("PAY_MYSTaxInformations", DbBlankMode.CipherOnly, "GrossTip", "BenefitsInKind"),
            new DbEncryptedColumns("PAY_PreviousEmployerAndMonthIncomes", DbBlankMode.CipherOnly,
                "NormalRemunerationAmount", "AdditionalRemunerationAmount", "EPFContributionAmount",
                "SOCSOContributionAmount", "ZakatThroughSalaryAmount", "MTDPaidAmount"),
            new DbEncryptedColumns("PAY_PreviousEmployerAndMonthIncomeAllowances", DbBlankMode.CipherOnly, "Amount"),
            new DbEncryptedColumns("PAY_SGPEmployeeAllocateCPFContris", DbBlankMode.CipherOnly,
                "OWSubjectToCPF", "AWSubjectToCPF", "RealOWSubjectToCPF", "RealAWSubjectToCPF",
                "EEOWContribution", "EROWContribution", "EEAWContribution", "ERAWContribution"),
            new DbEncryptedColumns("PAY_SGPIRASInformations", DbBlankMode.CipherOnly, "EmployerContribution", "EmployeeContribution"),
            new DbEncryptedColumns("PAY_SGPExcessCPFContributions", DbBlankMode.CipherOnly,
                "WagesAmount", "EmployeerContribution", "EmployeerInterest", "EmployeeContribution", "EmployeeInterest"),
            new DbEncryptedColumns("PAY_SGPIRASInformationAppendixB_DetailofGrains", DbBlankMode.CipherOnly,
                "ExercisePrice", "OpenMarketValuePerShare", "OpenMarketValuePerShare2", "NumberOfSharesAcquired",
                "GrossAmountQualifying", "GrossAmounNotQualifying", "GrossAmountOfGains"),
            new DbEncryptedColumns("PAY_SGPIRASInformationAppendixB_DetailofUnexerciseds", DbBlankMode.CipherOnly,
                "ExercisePrice", "OpenMarketValuePerShare", "MarketValueAtTime", "NoOfUnexercised"),
            new DbEncryptedColumns("INS_EmployeeInsurances", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("INS_EmployeePaymentParameters", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("INS_EmpPaymentParameterRetros", DbBlankMode.CipherOnly, "Value"),
            new DbEncryptedColumns("INS_VNMInsuranceSalaries", DbBlankMode.CipherOnly, "InsuranceSalary"),
            new DbEncryptedColumns("INS_InsuranceHistories", DbBlankMode.CipherOnly, "SISalary", "HISalary", "UISalary", "ORISalary"),
            new DbEncryptedColumns("INS_EmpInsuranceRetros", DbBlankMode.CipherOnly, "OldValue", "NewValue", "DifferenceValue"),
            new DbEncryptedColumns("INS_EmpInsuranceSumRetros", DbBlankMode.CipherOnly, "RetroEmployeePay", "RetroCompanyPay"),
            new DbEncryptedColumns("INS_EmpInsuranceStatusRetros", DbBlankMode.CipherOnly,
                "OldInsuranceSalary", "NewInsuranceSalary", "RetroEmployeePay", "RetroCompanyPay")
        };

        public static readonly DbDynamicEncryptedTables[] DynamicAmountTables =
        {
            new DbDynamicEncryptedTables("PAY[_]MasterPayroll%"),
            new DbDynamicEncryptedTables("PAY[_]MasterBonusByYear%"),
            new DbDynamicEncryptedTables("PAY[_]MasterRetroSalaryByYear%"),
            new DbDynamicEncryptedTables("PAY[_]MasterRetroInsuranceByYear%"),
            new DbDynamicEncryptedTables("PAY[_]MasterServiceChargeByYear%"),
            new DbDynamicEncryptedTables("PAY[_]SGPIRASInformationAppendixes"),
            new DbDynamicEncryptedTables("SET[_]MasterInsuranceByYear%"),
            new DbDynamicEncryptedTables("SET[_]EmployeeMasterInsuranceByYear%"),
            new DbDynamicEncryptedTables("Setting[_]ExportDataToolDashboardContents%"),
            new DbDynamicEncryptedTables("Staffing[_]EmployeeAllwanceInfor%Temps"),
            new DbDynamicEncryptedTables("TestPerformance%")
        };

        public static readonly DbEncryptedColumns[] OtherEncryptedColumns =
        {
            new DbEncryptedColumns("ESS_EmpProfileDrafts", DbBlankMode.All, "Value")
                .Where("T.[FieldName] IN (N'PersonalEmailAddress', N'BusinessEmailAddress', N'MobilePhone1', N'MobilePhone2', N'HomePhone1', N'HomePhone2')"),
            new DbEncryptedColumns("SIG_ExternalSignatories", DbBlankMode.All, "Email", "Phone"),
            new DbEncryptedColumns("Setting_AuditTrailHierarchy", DbBlankMode.All, "StringValue", "StringOldValue")
                .Where("T.[IsEncrypted] = 1"),
            new DbEncryptedColumns("Chat_Conversation", DbBlankMode.CipherOnly, "LastMessage"),
            new DbEncryptedColumns("Chat_PinnedMessages", DbBlankMode.CipherOnly, "PinnedMessage")
        };

        public static readonly DbDynamicEncryptedTables[] DynamicOtherTables =
        {
            new DbDynamicEncryptedTables("Chat[_]Messages[_]%", "MessageText", "ReplyMessageText")
        };

        public static readonly DbEncryptedColumns[] IntegrationSecrets =
        {
            new DbEncryptedColumns("Setting_DWBInternalAPIs", DbBlankMode.All, "UserName", "Password", "APIEndPoint", "APIKey", "DatasetKey"),
            new DbEncryptedColumns("Setting_Partners", DbBlankMode.All,
                "AccessUserName", "AccessPassword", "AccessTokenString", "CommonUserName", "CommonPassword", "TokenString"),
            new DbEncryptedColumns("SIG_SignConfigurations", DbBlankMode.All, "ClientID", "ClientSecret"),
            new DbEncryptedColumns("SIG_VNPTUserCertificates", DbBlankMode.All, "PassWord", "TOTPKey"),
            new DbEncryptedColumns("Setting_ThirdPartyApplications", DbBlankMode.All, "ClientId", "ClientSecret")
        };

        public static readonly string[] TablesToClear =
        {
            "Setting_SendMailPendingAttachments",
            "Setting_SendMailPendings",
            "Setting_SendMailHistories",
            "Setting_InterfaceSendEmailHistories",
            "Security_UserMfaPINTrackings",
            "Security_ForgotPasswordTrackingVerifyCodes",
            "SIG_DocumentSignatureTrackingVerifyCodes",
            "REC_ConsentTrackingVerifyCodes",
            "Security_PasswordHistories",
            "Security_UserTokenDetails",
            "Security_UserTokens",
            "Security_AccountTokenDevice",
            "Setting_UserPushSubscriptions",
            "Staffing_EmployeeInforTemps"
        };

        public static readonly string[] DynamicKeyColumns =
        {
            "ID", "EmployeeID", "CompanyID", "TenantID", "PayGroupID", "PaymentPeriodID", "LocalEmployeeID", "Year", "Month"
        };

        public static readonly string[] PlainContactExcludedColumnNames = { "EmailSubject", "EmailBody" };

        public static readonly string[] PlainContactExcludedTables =
        {
            "Setting_EmailServers",
            "Security_Users",
            "SIG_ExternalSignatories",
            "Setting_EmailManagements",
            "INS_Hospitals"
        };

        public static IEnumerable<string> AllPlainContactExcludedTables()
        {
            foreach (var t in PlainContactExcludedTables) yield return t;
            foreach (var t in TablesToClear) yield return t;
        }

        public static bool IsEncryptedContactColumn(string table, string column)
        {
            foreach (var t in EmployeeContactTables)
            {
                if (!string.Equals(t.Table, table, StringComparison.OrdinalIgnoreCase)) continue;
                foreach (var c in t.EmailColumns)
                    if (string.Equals(c, column, StringComparison.OrdinalIgnoreCase)) return true;
                foreach (var c in t.PhoneColumns)
                    if (string.Equals(c, column, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        public static bool MatchesLikePattern(string value, string likePattern)
        {
            if (value == null || likePattern == null) return false;
            var segments = likePattern.Replace("[_]", "_").Split('%');
            if (segments.Length == 1)
                return string.Equals(value, segments[0], StringComparison.OrdinalIgnoreCase);
            var first = segments[0];
            var last = segments[segments.Length - 1];
            if (value.Length < first.Length + last.Length) return false;
            if (!value.StartsWith(first, StringComparison.OrdinalIgnoreCase)) return false;
            if (!value.EndsWith(last, StringComparison.OrdinalIgnoreCase)) return false;
            var position = first.Length;
            var limit = value.Length - last.Length;
            for (var i = 1; i < segments.Length - 1; i++)
            {
                var segment = segments[i];
                if (segment.Length == 0) continue;
                var idx = value.IndexOf(segment, position, StringComparison.OrdinalIgnoreCase);
                if (idx < 0 || idx + segment.Length > limit) return false;
                position = idx + segment.Length;
            }
            return true;
        }

        public static bool IsDynamicEncryptedTable(string table)
        {
            foreach (var d in DynamicAmountTables)
                if (MatchesLikePattern(table, d.LikePattern)) return true;
            foreach (var d in DynamicOtherTables)
                if (MatchesLikePattern(table, d.LikePattern)) return true;
            return false;
        }
    }
}
