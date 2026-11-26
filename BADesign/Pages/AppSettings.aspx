<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="AppSettings.aspx.cs"
    Inherits="BADesign.Pages.AppSettings" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Cài đặt ứng dụng - HR Helper</title>
    <uc:BaHead runat="server" />
    <style>
        .ba-settings-tab-hidden { display: none !important; }
        #appSettingsCards .ba-card { overflow: hidden; }
        #txtTestEmailTo { max-width: 280px; }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="ba-container">
            <uc:BaSidebar ID="ucBaSidebar" runat="server" />
            <div class="ba-main">
                <uc:BaTopBar ID="ucBaTopBar" runat="server" />
                <div class="ba-content">
                    <div class="ba-tabs ba-settings-tabs" id="appSettingsTabs">
                        <button type="button" class="ba-tab ba-settings-tab" data-settings-tab="general">Đăng ký và thông báo</button>
                        <button type="button" class="ba-tab ba-settings-tab" data-settings-tab="mail">Email và SFTP</button>
                        <button type="button" class="ba-tab ba-settings-tab" data-settings-tab="sanitize">Làm sạch dữ liệu</button>
                        <button type="button" class="ba-tab ba-settings-tab" data-settings-tab="security">Bảo mật</button>
                    </div>
                    <div class="ba-card-grid" id="appSettingsCards">
                    <div class="ba-card ba-collapse-section ba-card-collapsible" id="cardPublicBaseUrl" data-settings-tab="general" data-collapse-key="appSettings_publicBaseUrl" style="display:none">
                        <div class="ba-collapse-header" onclick="toggleAppSettingsCard('cardPublicBaseUrl'); return false;">
                            <span class="ba-collapse-icon">▼</span>
                            <h3 class="ba-card-title">Public URL</h3>
                        </div>
                        <div class="ba-collapse-body">
                        <p class="ba-section-hint">
                            URL công khai để user trong mạng nội bộ truy cập (ví dụ IP nội bộ). Link trong email đăng ký và forgot password sẽ dùng URL này thay vì localhost. Ví dụ: <code>https://192.168.42.82:1717</code> (không ghi /Login ở cuối).
                        </p>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Public Base URL</label>
                            <input type="url" id="txtPublicBaseUrl" class="ba-input" placeholder="https://192.168.42.82:1717" <%= !CanEditSettings ? "readonly" : "" %> />
                        </div>
                        <div id="msgPublicBaseUrl" class="ba-msg" style="display:none;"></div>
                        <div class="ba-actions">
                            <% if (CanEditSettings) { %>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnSavePublicBaseUrl" onclick="savePublicBaseUrl(); return false;">Lưu</button>
                            <% } else { %>
                            <span class="ba-field-hint">Chỉ user có quyền Settings mới có thể chỉnh sửa.</span>
                            <% } %>
                        </div>
                        </div>
                    </div>
                    <div class="ba-card ba-collapse-section ba-card-collapsible" id="cardRegistrationNotification" data-settings-tab="general" data-collapse-key="appSettings_registrationNotification">
                        <div class="ba-collapse-header" onclick="toggleAppSettingsCard('cardRegistrationNotification'); return false;">
                            <span class="ba-collapse-icon">▼</span>
                            <h3 class="ba-card-title">Sign Up & Notifications</h3>
                        </div>
                        <div class="ba-collapse-body">
                        <p class="ba-section-hint">
                            Cấu hình domain email được phép đăng ký và cách thông báo khi có tài khoản mới đăng ký (Telegram hoặc Email).
                        </p>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Email domain được phép đăng ký</label>
                            <p class="ba-field-hint">Chỉ email có đuôi trong danh sách mới được đăng ký. Mỗi dòng 1 pattern, ví dụ <code>*@cadena.com.sg</code>.</p>
                            <textarea id="txtRegAllowedDomains" class="ba-input" rows="3" placeholder="*@cadena.com.sg&#10;*@cadena-hrmseries.com" <%= !CanEditSettings ? "readonly" : "" %>></textarea>
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Khi có tài khoản đăng ký, thông báo qua</label>
                            <div class="ba-choice-row">
                                <label class="ba-checkbox">
                                    <input type="radio" name="regNotifyMethod" value="Email" id="regNotifyEmail" <%= !CanEditSettings ? "disabled" : "" %> />
                                    <span>Email</span>
                                </label>
                                <label class="ba-checkbox">
                                    <input type="radio" name="regNotifyMethod" value="Telegram" id="regNotifyTelegram" <%= !CanEditSettings ? "disabled" : "" %> />
                                    <span>Telegram</span>
                                </label>
                            </div>
                        </div>
                        <div id="panelRegNotifyEmail" class="ba-subpanel">
                            <label class="ba-form-label">Gửi thông báo tới email (mỗi dòng 1 địa chỉ)</label>
                            <p class="ba-field-hint">Hệ thống gửi email thông báo user mới đăng ký tới các địa chỉ này. Mặc định: <code>an.nh@cadena.com.sg</code></p>
                            <textarea id="txtRegNotifyEmails" class="ba-input" rows="3" placeholder="an.nh@cadena.com.sg" <%= !CanEditSettings ? "readonly" : "" %>></textarea>
                        </div>
                        <div id="panelRegNotifyTelegram" class="ba-subpanel" style="display: none;">
                            <p class="ba-section-hint">Gửi tin nhắn tới nhóm Telegram. Nếu chat not found thử: -100{số}, -{số} hoặc {số}.</p>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Telegram Bot API Key (Bot Token) (*)</label>
                                <input type="text" id="txtTelegramBotToken" class="ba-input" placeholder="1234567890:AAHxxxx..." autocomplete="off" <%= !CanEditSettings ? "readonly" : "" %> />
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Telegram Group ID (Chat ID) (*)</label>
                                <input type="text" id="txtTelegramChatId" class="ba-input" placeholder="-1001234567890" <%= !CanEditSettings ? "readonly" : "" %> />
                            </div>
                        </div>
                        <div id="msgRegistrationNotification" class="ba-msg" style="display:none;"></div>
                        <div class="ba-actions">
                            <% if (CanEditSettings) { %>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnSaveRegistrationNotification" onclick="saveRegistrationNotificationConfig(); return false;">Lưu</button>
                            <% } else { %>
                            <span class="ba-field-hint">Chỉ user có quyền Settings mới có thể chỉnh sửa.</span>
                            <% } %>
                        </div>
                        </div>
                    </div>
                   <div class="ba-card ba-collapse-section ba-card-collapsible" id="cardEmailIgnore" data-settings-tab="mail" data-collapse-key="appSettings_emailIgnore">
                        <div class="ba-collapse-header" onclick="toggleAppSettingsCard('cardEmailIgnore'); return false;">
                            <span class="ba-collapse-icon">▼</span>
                            <h3 class="ba-card-title">Email Ignore (HR Multi-DB)</h3>
                        </div>
                        <div class="ba-collapse-body">
                        <p class="ba-section-hint">
                            Các email/pattern trong danh sách được coi là nội bộ (đã reset). Trợ lý HR Multi-DB sẽ load config từ đây. Mỗi dòng 1 giá trị. Dùng *@domain.com cho suffix.
                        </p>
                        <textarea id="txtEmailIgnore" class="ba-input" rows="5" placeholder="*@cadena.com.sg&#10;test@internal.com" <%= !CanEditSettings ? "readonly" : "" %>></textarea>
                        <div id="msgEmailIgnore" class="ba-msg" style="display:none;"></div>
                        <div class="ba-actions">
                            <% if (CanEditSettings) { %>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnSave" onclick="saveEmailIgnore(); return false;">Lưu</button>
                            <% } else { %>
                            <span class="ba-field-hint">Chỉ user có quyền Settings mới có thể chỉnh sửa.</span>
                            <% } %>
                        </div>
                        </div>
                    </div>
                    
                    <div class="ba-card ba-collapse-section ba-card-collapsible" id="cardEmailServer" data-settings-tab="mail" data-collapse-key="appSettings_emailServer">
                        <div class="ba-collapse-header" onclick="toggleAppSettingsCard('cardEmailServer'); return false;">
                            <span class="ba-collapse-icon">▼</span>
                            <h3 class="ba-card-title">Email Server Settings</h3>
                        </div>
                        <div class="ba-collapse-body">
                        <p class="ba-section-hint">
                            Cấu hình SMTP dùng khi restore + reset (ghi vào Setting_EmailServers) và dùng cho nút &quot;Cadena Email Server&quot; trong Trợ lý HR (load vào form Company Info).
                        </p>
                        <div class="ba-form-cols">
                            <div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Outgoing Email Server (*)</label>
                                    <input type="text" id="txtEmailServerOutgoing" class="ba-input" placeholder="xmail.example.com" <%= !CanEditSettings ? "readonly" : "" %> />
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Port (*)</label>
                                    <input type="text" id="txtEmailServerPort" class="ba-input" placeholder="25" <%= !CanEditSettings ? "readonly" : "" %> />
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Account Name (*)</label>
                                    <input type="text" id="txtEmailServerAccountName" class="ba-input" placeholder="CADENA" <%= !CanEditSettings ? "readonly" : "" %> />
                                </div>
                            </div>
                            <div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Username (*)</label>
                                    <input type="text" id="txtEmailServerUsername" class="ba-input" placeholder="user@example.com" <%= !CanEditSettings ? "readonly" : "" %> />
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Email Address (*)</label>
                                    <input type="text" id="txtEmailServerEmailAddress" class="ba-input" placeholder="user@example.com" <%= !CanEditSettings ? "readonly" : "" %> />
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Password (*)</label>
                                    <input type="password" id="txtEmailServerPassword" class="ba-input" placeholder="••••••••" <%= !CanEditSettings ? "readonly" : "" %> />
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-checkbox">
                                        <input type="checkbox" id="chkEmailServerSSL" <%= !CanEditSettings ? "disabled" : "" %> />
                                        <label for="chkEmailServerSSL">Enable SSL</label>
                                    </div>
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">SSL Port</label>
                                    <input type="number" id="txtEmailServerSSLPort" class="ba-input" placeholder="465" min="1" max="65535" <%= !CanEditSettings ? "readonly" : "" %> />
                                </div>
                            </div>
                        </div>
                        <div class="ba-form-group ba-form-divider">
                            <label class="ba-form-label">Test Email Sent To</label>
                            <div class="ba-inline">
                                <input type="email" id="txtTestEmailTo" class="ba-input" placeholder="email@example.com" <%= !CanEditSettings ? "readonly" : "" %> />
                                <button type="button" class="ba-btn ba-btn-secondary" id="btnTestEmailConnection" onclick="testEmailConnection(); return false;" <%= !CanEditSettings ? "disabled" : "" %>>Test Connection</button>
                            </div>
                            <p class="ba-field-hint">Nhập email nhận thử. Sẽ gửi email test dùng cấu hình trên (chưa lưu cũng được).</p>
                        </div>
                        <div id="msgEmailServer" class="ba-msg" style="display:none;"></div>
                        <div class="ba-actions">
                            <% if (CanEditSettings) { %>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnSaveEmailServer" onclick="saveEmailServerConfig(); return false;">Lưu</button>
                            <% } else { %>
                            <span class="ba-field-hint">Chỉ user có quyền Settings mới có thể chỉnh sửa.</span>
                            <% } %>
                        </div>
                        </div>
                    </div>
                    <div class="ba-card ba-collapse-section ba-card-collapsible" id="cardSftp" data-settings-tab="mail" data-collapse-key="appSettings_sftp">
                        <div class="ba-collapse-header" onclick="toggleAppSettingsCard('cardSftp'); return false;">
                            <span class="ba-collapse-icon">▼</span>
                            <h3 class="ba-card-title">SFTP Connection</h3>
                        </div>
                        <div class="ba-collapse-body">
                        <p class="ba-section-hint">
                            Thông tin kết nối SFTP dùng khi tự động restore + reset database.
                        </p>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Host</label>
                            <input type="text" id="txtSftpHost" class="ba-input" placeholder="sftp.example.com" <%= !CanEditSettings ? "readonly" : "" %> />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Port</label>
                            <input type="text" id="txtSftpPort" class="ba-input" placeholder="22" <%= !CanEditSettings ? "readonly" : "" %> />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">User</label>
                            <input type="text" id="txtSftpUser" class="ba-input" placeholder="username" <%= !CanEditSettings ? "readonly" : "" %> />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Password</label>
                            <input type="password" id="txtSftpPassword" class="ba-input" placeholder="••••••••" <%= !CanEditSettings ? "readonly" : "" %> />
                        </div>
                        <div id="msgSftp" class="ba-msg" style="display:none;"></div>
                        <div class="ba-actions">
                            <% if (CanEditSettings) { %>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnSaveSftp" onclick="saveSftpConfig(); return false;">Lưu</button>
                            <% } else { %>
                            <span class="ba-field-hint">Chỉ user có quyền Settings mới có thể chỉnh sửa.</span>
                            <% } %>
                        </div>
                        </div>
                    </div>
                    <div class="ba-card ba-collapse-section ba-card-collapsible collapsed" id="cardResetPhone" data-settings-tab="sanitize" data-collapse-key="appSettings_resetPhone">
                        <div class="ba-collapse-header" onclick="toggleAppSettingsCard('cardResetPhone'); return false;">
                            <span class="ba-collapse-icon">▼</span>
                            <h3 class="ba-card-title">Phone Default</h3>
                        </div>
                        <div class="ba-collapse-body">
                        <p class="ba-section-hint">
                            Số điện thoại mặc định khi restore database hoặc reset cột Phone trong Trợ lý HR. Nếu không cấu hình, hệ thống dùng <code>0987654321</code>.
                        </p>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Số điện thoại mặc định</label>
                            <input type="text" id="txtResetPhoneDefault" class="ba-input" placeholder="0987654321" <%= !CanEditSettings ? "readonly" : "" %> />
                        </div>
                        <div id="msgResetPhone" class="ba-msg" style="display:none;"></div>
                        <div class="ba-actions">
                            <% if (CanEditSettings) { %>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnSaveResetPhone" onclick="saveResetPhoneDefault(); return false;">Lưu</button>
                            <% } else { %>
                            <span class="ba-field-hint">Chỉ user có quyền Settings mới có thể chỉnh sửa.</span>
                            <% } %>
                        </div>
                        </div>
                    </div>
                    <div class="ba-card ba-collapse-section ba-card-collapsible collapsed" id="cardSanitizeDefaults" data-settings-tab="sanitize" data-collapse-key="appSettings_sanitizeDefaults">
                        <div class="ba-collapse-header" onclick="toggleAppSettingsCard('cardSanitizeDefaults'); return false;">
                            <span class="ba-collapse-icon">▼</span>
                            <h3 class="ba-card-title">Làm sạch dữ liệu sau restore</h3>
                        </div>
                        <div class="ba-collapse-body">
                        <p class="ba-section-hint">
                            Giá trị mặc định điền sẵn trong bước Làm sạch dữ liệu của form Restore database. Email server, SFTP và số điện thoại lấy từ các mục phía trên.
                        </p>
                        <div class="ba-form-group">
                            <label class="ba-form-label" for="txtSanitizePassword">Mật khẩu đăng nhập chung</label>
                            <input type="text" id="txtSanitizePassword" class="ba-input" placeholder="1" autocomplete="off" <%= !CanEditSettings ? "readonly" : "" %> />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label" for="txtSanitizeSalaryMin">Khoảng lương giả (nhỏ nhất – lớn nhất)</label>
                            <div class="ba-inline ba-inline-nowrap">
                                <input type="number" id="txtSanitizeSalaryMin" class="ba-input" min="0" step="1" <%= !CanEditSettings ? "readonly" : "" %> />
                                <span class="ba-field-hint">đến</span>
                                <input type="number" id="txtSanitizeSalaryMax" class="ba-input" min="0" step="1" <%= !CanEditSettings ? "readonly" : "" %> />
                            </div>
                        </div>
                        <div id="msgSanitizeDefaults" class="ba-msg" style="display:none;"></div>
                        <div class="ba-actions">
                            <% if (CanEditSettings) { %>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnSaveSanitizeDefaults" onclick="saveSanitizeDefaults(); return false;">Lưu</button>
                            <% } else { %>
                            <span class="ba-field-hint">Chỉ user có quyền Settings mới có thể chỉnh sửa.</span>
                            <% } %>
                        </div>
                        </div>
                    </div>
                    <div class="ba-card ba-collapse-section ba-card-collapsible" id="cardStoredSecrets" data-settings-tab="security" data-collapse-key="appSettings_storedSecrets">
                        <div class="ba-collapse-header" onclick="toggleAppSettingsCard('cardStoredSecrets'); return false;">
                            <span class="ba-collapse-icon">▼</span>
                            <h3 class="ba-card-title">Mã hóa dữ liệu nhạy cảm</h3>
                        </div>
                        <div class="ba-collapse-body">
                        <p class="ba-section-hint">
                            Mật khẩu SQL Server của các server, mật khẩu Email server, mật khẩu SFTP, Telegram Bot Token và chuỗi kết nối trong job của Trợ lý HR được lưu trong database của tool. Khi bật, các giá trị này được lưu ở dạng đã mã hóa.
                        </p>
                        <p class="ba-section-hint">
                            Chỉ bật khi mọi bản web và Worker dùng chung database này đã là bản mới: bản cũ không đọc được giá trị đã mã hóa. Trước khi bật, chạy <code>Scripts/AddStoredSecretEncryption.sql</code> trên database của tool.
                        </p>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Trạng thái</label>
                            <div>
                                <span class="ba-badge" id="lblStoredSecretsState">Đang tải</span>
                                <span class="ba-field-hint" id="lblStoredSecretsCounts"></span>
                            </div>
                        </div>
                        <div id="msgStoredSecrets" class="ba-msg" style="display:none;"></div>
                        <div class="ba-actions">
                            <% if (CanSwitchStoredSecrets) { %>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnStoredSecretsOn" onclick="switchStoredSecrets(true); return false;">Bật và mã hóa dữ liệu đang có</button>
                            <button type="button" class="ba-btn ba-btn-secondary" id="btnStoredSecretsOff" onclick="switchStoredSecrets(false); return false;">Tắt và giải mã</button>
                            <% } else { %>
                            <span class="ba-field-hint">Chỉ Super Admin mới bật hoặc tắt được.</span>
                            <% } %>
                        </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    </form>
    <script>
        function showAppSettingsTab(tab) {
            var $tabs = $('#appSettingsTabs .ba-settings-tab');
            if (!$tabs.filter('[data-settings-tab="' + tab + '"]').length) tab = 'general';
            $tabs.removeClass('active').filter('[data-settings-tab="' + tab + '"]').addClass('active');
            $('.ba-card[data-settings-tab]').each(function() {
                $(this).toggleClass('ba-settings-tab-hidden', $(this).attr('data-settings-tab') !== tab);
            });
            try { localStorage.setItem('appSettings_tab', tab); } catch (e) {}
        }
        $(function() {
            var saved = null;
            try { saved = localStorage.getItem('appSettings_tab'); } catch (e) {}
            showAppSettingsTab(saved || 'general');
            $('#appSettingsTabs').on('click', '.ba-settings-tab', function() { showAppSettingsTab($(this).attr('data-settings-tab')); });
        });
        function toggleAppSettingsCard(cardId) {
            var $card = $('#' + cardId);
            if (!$card.length) return;
            $card.toggleClass('collapsed');
            var key = 'appSettings_collapse_' + ($card.attr('data-collapse-key') || cardId);
            try { localStorage.setItem(key, $card.hasClass('collapsed') ? '1' : '0'); } catch (e) {}
        }
        (function restoreAppSettingsCollapse() {
            $('.ba-card-collapsible').each(function() {
                var key = 'appSettings_collapse_' + ($(this).attr('data-collapse-key') || this.id);
                try {
                    if (localStorage.getItem(key) === '1') $(this).addClass('collapsed');
                } catch (e) {}
            });
        })();
        (function() {
            var key = 'baSidebarCollapsed';
            var $sb = $('#baSidebar');
            var $btn = $('#baSidebarToggle');
            if (localStorage.getItem(key) === '1') $sb.addClass('collapsed');
            $btn.on('click', function() {
                $sb.toggleClass('collapsed');
                localStorage.setItem(key, $sb.hasClass('collapsed') ? '1' : '0');
            });
        })();
        (function () {
            function loadEmailIgnore() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/LoadEmailIgnoreConfigPublic") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: '{}',
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success && d.list && d.list.length) {
                        $('#txtEmailIgnore').val(d.list.join('\n'));
                    }
                }).fail(function () {
                    $('#msgEmailIgnore').removeClass('success').addClass('error').text('Không load được config.').show();
                });
            }
            window.saveEmailIgnore = function () {
                var lines = $('#txtEmailIgnore').val().split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
                $('#msgEmailIgnore').hide();
                $('#btnSave').prop('disabled', true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/SaveEmailIgnoreToSettings") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ patterns: lines }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#msgEmailIgnore').removeClass('error').addClass('success').text('Đã lưu.').show();
                    } else {
                        $('#msgEmailIgnore').removeClass('success').addClass('error').text(d && d.message ? d.message : 'Lỗi.').show();
                    }
                }).fail(function () {
                    $('#msgEmailIgnore').removeClass('success').addClass('error').text('Lỗi khi lưu.').show();
                }).always(function () {
                    $('#btnSave').prop('disabled', false);
                });
            };
            loadEmailIgnore();
            (function loadPublicBaseUrl() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/LoadPublicBaseUrl") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: '{}',
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#txtPublicBaseUrl').val(d.value || '');
                    }
                });
            })();
            window.savePublicBaseUrl = function () {
                $('#msgPublicBaseUrl').hide();
                $('#btnSavePublicBaseUrl').prop('disabled', true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/SavePublicBaseUrl") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ value: $('#txtPublicBaseUrl').val() || '' }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#msgPublicBaseUrl').removeClass('error').addClass('success').text('Đã lưu.').show();
                    } else {
                        $('#msgPublicBaseUrl').removeClass('success').addClass('error').text(d && d.message ? d.message : 'Lỗi.').show();
                    }
                }).fail(function () {
                    $('#msgPublicBaseUrl').removeClass('success').addClass('error').text('Lỗi khi lưu.').show();
                }).always(function () {
                    $('#btnSavePublicBaseUrl').prop('disabled', false);
                });
            };
            (function loadRegistrationNotificationConfig() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/LoadRegistrationNotificationConfig") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: '{}',
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#txtRegAllowedDomains').val(d.allowedPatterns || '');
                        var method = (d.notificationMethod || 'Email').trim();
                        if (method !== 'Telegram' && method !== 'Email') method = 'Email';
                        $('input[name="regNotifyMethod"]').val([method]);
                        $('#txtRegNotifyEmails').val(d.notifyEmails || 'an.nh@cadena.com.sg');
                        $('#txtTelegramBotToken').val(d.botToken || '');
                        $('#txtTelegramChatId').val(d.chatId || '');
                        toggleRegNotifyPanel();
                    }
                });
            })();
            function toggleRegNotifyPanel() {
                var isEmail = $('#regNotifyEmail').prop('checked');
                $('#panelRegNotifyEmail').toggle(isEmail);
                $('#panelRegNotifyTelegram').toggle(!isEmail);
            }
            $('input[name="regNotifyMethod"]').on('change', toggleRegNotifyPanel);
            window.saveRegistrationNotificationConfig = function () {
                $('#msgRegistrationNotification').hide();
                $('#btnSaveRegistrationNotification').prop('disabled', true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/SaveRegistrationNotificationConfig") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({
                        allowedPatterns: $('#txtRegAllowedDomains').val() || '',
                        notificationMethod: $('#regNotifyEmail').prop('checked') ? 'Email' : 'Telegram',
                        notifyEmails: $('#txtRegNotifyEmails').val() || 'an.nh@cadena.com.sg',
                        botToken: $('#txtTelegramBotToken').val() || '',
                        chatId: $('#txtTelegramChatId').val() || ''
                    }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#msgRegistrationNotification').removeClass('error').addClass('success').text('Đã lưu.').show();
                    } else {
                        $('#msgRegistrationNotification').removeClass('success').addClass('error').text(d && d.message ? d.message : 'Lỗi.').show();
                    }
                }).fail(function () {
                    $('#msgRegistrationNotification').removeClass('success').addClass('error').text('Lỗi khi lưu.').show();
                }).always(function () {
                    $('#btnSaveRegistrationNotification').prop('disabled', false);
                });
            };
            (function loadEmailServerConfig() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/LoadEmailServerConfig") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: '{}',
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#txtEmailServerOutgoing').val(d.outgoingServer || '');
                        $('#txtEmailServerPort').val(d.port || '');
                        $('#txtEmailServerAccountName').val(d.accountName || '');
                        $('#txtEmailServerUsername').val(d.username || '');
                        $('#txtEmailServerEmailAddress').val(d.emailAddress || '');
                        $('#txtEmailServerPassword').val(d.password || '');
                        $('#chkEmailServerSSL').prop('checked', !!d.enableSSL);
                        $('#txtEmailServerSSLPort').val(d.sslPort != null && d.sslPort !== '' ? d.sslPort : '');
                    }
                });
            })();
            window.saveEmailServerConfig = function () {
                $('#msgEmailServer').hide();
                $('#btnSaveEmailServer').prop('disabled', true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/SaveEmailServerConfig") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({
                        outgoingServer: $('#txtEmailServerOutgoing').val() || '',
                        port: $('#txtEmailServerPort').val() || '',
                        accountName: $('#txtEmailServerAccountName').val() || '',
                        username: $('#txtEmailServerUsername').val() || '',
                        emailAddress: $('#txtEmailServerEmailAddress').val() || '',
                        password: $('#txtEmailServerPassword').val() || '',
                        enableSSL: $('#chkEmailServerSSL').prop('checked'),
                        sslPort: $('#txtEmailServerSSLPort').val() || ''
                    }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#msgEmailServer').removeClass('error').addClass('success').text('Đã lưu.').show();
                    } else {
                        $('#msgEmailServer').removeClass('success').addClass('error').text(d && d.message ? d.message : 'Lỗi.').show();
                    }
                }).fail(function () {
                    $('#msgEmailServer').removeClass('success').addClass('error').text('Lỗi khi lưu.').show();
                }).always(function () {
                    $('#btnSaveEmailServer').prop('disabled', false);
                });
            };
            window.testEmailConnection = function () {
                var to = ($('#txtTestEmailTo').val() || '').trim();
                if (!to) {
                    $('#msgEmailServer').removeClass('success').addClass('error').text('Vui lòng nhập email nhận thử.').show();
                    return;
                }
                $('#msgEmailServer').hide();
                $('#btnTestEmailConnection').prop('disabled', true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/TestEmailConnection") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({
                        testEmailTo: to,
                        outgoingServer: $('#txtEmailServerOutgoing').val() || '',
                        port: $('#txtEmailServerPort').val() || '',
                        accountName: $('#txtEmailServerAccountName').val() || '',
                        username: $('#txtEmailServerUsername').val() || '',
                        emailAddress: $('#txtEmailServerEmailAddress').val() || '',
                        password: $('#txtEmailServerPassword').val() || '',
                        enableSSL: $('#chkEmailServerSSL').prop('checked'),
                        sslPort: $('#txtEmailServerSSLPort').val() || ''
                    }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#msgEmailServer').removeClass('error').addClass('success').text('Đã gửi email test đến ' + to + '.').show();
                    } else {
                        $('#msgEmailServer').removeClass('success').addClass('error').text(d && d.message ? d.message : 'Không gửi được.').show();
                    }
                }).fail(function (xhr) {
                    var msg = 'Lỗi khi test.';
                    try {
                        var j = xhr.responseJSON && (xhr.responseJSON.d || xhr.responseJSON);
                        if (j && j.message) msg = j.message;
                    } catch (e) {}
                    $('#msgEmailServer').removeClass('success').addClass('error').text(msg).show();
                }).always(function () {
                    $('#btnTestEmailConnection').prop('disabled', false);
                });
            };
            (function loadSftpConfig() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/LoadSftpConfig") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: '{}',
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#txtSftpHost').val(d.host || '');
                        $('#txtSftpPort').val(d.port || '');
                        $('#txtSftpUser').val(d.user || '');
                        $('#txtSftpPassword').val(d.password || '');
                    }
                });
            })();
            (function loadResetPhoneDefault() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/LoadResetPhoneDefault") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: '{}',
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success)
                        $('#txtResetPhoneDefault').val(d.value || '');
                });
            })();
            window.saveResetPhoneDefault = function () {
                $('#msgResetPhone').hide();
                $('#btnSaveResetPhone').prop('disabled', true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/SaveResetPhoneDefault") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ value: ($('#txtResetPhoneDefault').val() || '').trim() }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#msgResetPhone').removeClass('error').addClass('success').text('Đã lưu.').show();
                    } else {
                        $('#msgResetPhone').removeClass('success').addClass('error').text(d && d.message ? d.message : 'Lỗi.').show();
                    }
                }).fail(function () {
                    $('#msgResetPhone').removeClass('success').addClass('error').text('Lỗi khi lưu.').show();
                }).always(function () {
                    $('#btnSaveResetPhone').prop('disabled', false);
                });
            };
            (function loadSanitizeDefaults() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/LoadSanitizeDefaults") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: '{}',
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#txtSanitizePassword').val(d.password || '');
                        $('#txtSanitizeSalaryMin').val(d.salaryMin || '');
                        $('#txtSanitizeSalaryMax').val(d.salaryMax || '');
                    }
                });
            })();
            window.saveSanitizeDefaults = function () {
                $('#msgSanitizeDefaults').hide();
                $('#btnSaveSanitizeDefaults').prop('disabled', true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/SaveSanitizeDefaults") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({
                        password: ($('#txtSanitizePassword').val() || '').trim(),
                        salaryMin: ($('#txtSanitizeSalaryMin').val() || '').trim(),
                        salaryMax: ($('#txtSanitizeSalaryMax').val() || '').trim()
                    }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#msgSanitizeDefaults').removeClass('error').addClass('success').text('Đã lưu.').show();
                    } else {
                        $('#msgSanitizeDefaults').removeClass('success').addClass('error').text(d && d.message ? d.message : 'Lỗi.').show();
                    }
                }).fail(function () {
                    $('#msgSanitizeDefaults').removeClass('success').addClass('error').text('Lỗi khi lưu.').show();
                }).always(function () {
                    $('#btnSaveSanitizeDefaults').prop('disabled', false);
                });
            };
            window.saveSftpConfig = function () {
                $('#msgSftp').hide();
                $('#btnSaveSftp').prop('disabled', true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/SaveSftpConfig") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({
                        host: $('#txtSftpHost').val() || '',
                        port: $('#txtSftpPort').val() || '',
                        user: $('#txtSftpUser').val() || '',
                        password: $('#txtSftpPassword').val() || ''
                    }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#msgSftp').removeClass('error').addClass('success').text('Đã lưu.').show();
                    } else {
                        $('#msgSftp').removeClass('success').addClass('error').text(d && d.message ? d.message : 'Lỗi.').show();
                    }
                }).fail(function () {
                    $('#msgSftp').removeClass('success').addClass('error').text('Lỗi khi lưu.').show();
                }).always(function () {
                    $('#btnSaveSftp').prop('disabled', false);
                });
            };
            function showStoredSecretStatus(d) {
                $('#lblStoredSecretsState').text(d.on ? 'Đang bật' : 'Đang tắt').toggleClass('ba-badge-ok', !!d.on);
                $('#lblStoredSecretsCounts').text('Đã mã hóa: ' + d.protectedCount + ', dạng thường: ' + d.plainCount);
            }
            function showStoredSecretError(message) {
                $('#msgStoredSecrets').removeClass('success').addClass('error').text(message).show();
            }
            function onStoredSecretStatusLoaded(r) {
                var d = (typeof r.d !== 'undefined') ? r.d : r;
                if (!d || !d.success) {
                    showStoredSecretError(d && d.message ? d.message : 'Lỗi.');
                    return;
                }
                showStoredSecretStatus(d);
            }
            function onStoredSecretSwitched(r) {
                var d = (typeof r.d !== 'undefined') ? r.d : r;
                if (!d || !d.success) {
                    showStoredSecretError(d && d.message ? d.message : 'Lỗi.');
                    return;
                }
                showStoredSecretStatus(d);
                $('#msgStoredSecrets').removeClass('error').addClass('success').text('Đã đổi ' + d.changedCount + ' giá trị.').show();
            }
            (function loadStoredSecretStatus() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/LoadStoredSecretStatus") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: '{}',
                    dataType: 'json'
                }).done(onStoredSecretStatusLoaded).fail(function () {
                    showStoredSecretError('Không load được config.');
                });
            })();
            function runStoredSecretSwitch(on) {
                var $buttons = $('#btnStoredSecretsOn, #btnStoredSecretsOff');
                $('#msgStoredSecrets').hide();
                $buttons.prop('disabled', true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/SwitchStoredSecrets") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ on: on }),
                    dataType: 'json'
                }).done(onStoredSecretSwitched).fail(function () {
                    showStoredSecretError('Lỗi khi lưu.');
                }).always(function () {
                    $buttons.prop('disabled', false);
                });
            }
            window.switchStoredSecrets = function (on) {
                var msg = on
                    ? 'Bật mã hóa và mã hóa mọi giá trị đang lưu? Bản web hoặc Worker cũ dùng chung database này sẽ không đọc được nữa.'
                    : 'Tắt mã hóa và đưa mọi giá trị đang lưu về dạng thường?';
                if (typeof baConfirm === 'function') baConfirm(msg, function () { runStoredSecretSwitch(on); }, null, 'Đồng ý', 'Thoát');
            };
        })();
    </script>
</body>
</html>
