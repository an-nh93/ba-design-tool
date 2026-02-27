/* Sidebar collapse, theme switcher, user menu - dùng chung cho các trang có BaSidebar + BaTopBar */
$(function() {
    var key = 'baSidebarCollapsed';
    var $sb = $('.ba-sidebar').first();
    if ($sb.length && localStorage.getItem(key) === '1') $sb.addClass('collapsed');
});
$(document).on('click', '.ba-sidebar-toggle', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var $sb = $(this).closest('.ba-sidebar');
    if ($sb.length) {
        $sb.toggleClass('collapsed');
        try { localStorage.setItem('baSidebarCollapsed', $sb.hasClass('collapsed') ? '1' : '0'); } catch (err) {}
    }
});
function toggleUserMenu(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var dropdown = document.getElementById('userMenuDropdown');
    if (dropdown) dropdown.classList.toggle('show');
    return false;
}
function closeUserMenu() {
    var dropdown = document.getElementById('userMenuDropdown');
    if (dropdown) dropdown.classList.remove('show');
}
$(document).on('click', function(e) {
    if (!$(e.target).closest('.user-menu').length) closeUserMenu();
});
function initTheme() {
    var savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
}
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.remove('light-theme');
        var icon = document.getElementById('themeIcon');
        var text = document.getElementById('themeText');
        if (icon) icon.textContent = '🌙';
        if (text) text.textContent = 'Light';
    } else {
        document.body.classList.add('light-theme');
        var icon = document.getElementById('themeIcon');
        var text = document.getElementById('themeText');
        if (icon) icon.textContent = '☀️';
        if (text) text.textContent = 'Dark';
    }
    localStorage.setItem('theme', theme);
}
function toggleTheme(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var currentTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    return false;
}
$(function() { initTheme(); });
