(function(global) {
    var kinds = {
        success: { icon: '✓', life: 5000 },
        error: { icon: '✕', life: 10000 },
        warning: { icon: '!', life: 7000 },
        info: { icon: 'i', life: 4000 }
    };
    function host() {
        var el = document.getElementById('baToastContainer');
        if (!el) {
            el = document.createElement('div');
            el.id = 'baToastContainer';
            el.className = 'ba-toast-container';
            document.body.appendChild(el);
        }
        return el;
    }
    function show(message, type) {
        var kind = kinds[type] ? type : 'info';
        var toast = document.createElement('div');
        toast.className = 'ba-toast ba-toast-' + kind;
        toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
        var icon = document.createElement('span');
        icon.className = 'ba-toast-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.setAttribute('translate', 'no');
        icon.textContent = kinds[kind].icon;
        var text = document.createElement('span');
        text.className = 'ba-toast-msg';
        text.textContent = message == null ? '' : String(message);
        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'ba-toast-close';
        close.title = 'Đóng';
        close.textContent = '×';
        toast.appendChild(icon);
        toast.appendChild(text);
        toast.appendChild(close);
        host().appendChild(toast);
        var timer = null;
        function dismiss() {
            if (timer) clearTimeout(timer);
            toast.classList.remove('show');
            setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 250);
        }
        close.addEventListener('click', dismiss);
        setTimeout(function() { toast.classList.add('show'); }, 10);
        timer = setTimeout(dismiss, kinds[kind].life);
        return toast;
    }
    global.BaToast = { show: show };
})(window);
