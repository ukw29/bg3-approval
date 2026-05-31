const MOD_ID = "bg3-approval";
const DEFAULT_CONFIG = [
    { label: "赞同", icon: "fas fa-thumbs-up", color: "#4eff4e", text: "赞同" },
    { label: "不认同", icon: "fas fa-thumbs-down", color: "#ff4e4e", text: "不认同" },
    { label: "吃瓜", icon: "fas fa-eye", color: "#4ebaff", text: "吃瓜" }
];

Hooks.once("init", () => {
    game.settings.register(MOD_ID, "buttonConfig", {
        name: "自定义菜单选项",
        scope: "world",
        config: true,
        type: String,
        default: JSON.stringify(DEFAULT_CONFIG, null, 2)
    });
    game.settings.register(MOD_ID, "duration", {
        name: "通知停留时间 (毫秒)",
        scope: "world",
        config: true,
        type: Number,
        default: 4000
    });
});

Hooks.once("ready", () => {
    // 预先创建容器，不需要等到发消息时再建
    ensureContainer();

    // 监听 Socket
    game.socket.on(`module.${MOD_ID}`, (payload) => {
        if (payload.operation === "showNotification") {
            renderToast(payload.name, payload.img, payload.text, payload.color);
        }
    });
});

Hooks.on("renderTokenHUD", (app, html, data) => {
    const token = app.object;
    if (!token.isOwner) return;

    const $html = html instanceof HTMLElement ? $(html) : html;
    if ($html.find(".bg3-approval-hud-btn").length > 0) return;

    let buttons;
    try {
        buttons = JSON.parse(game.settings.get(MOD_ID, "buttonConfig"));
    } catch {
        buttons = DEFAULT_CONFIG;
    }

    let menuHtml = "";
    buttons.forEach(btn => {
        const displayName = btn.label || btn.text || "未知";
        menuHtml += `<div class="bg3-approval-option" data-text="${btn.text}" data-color="${btn.color}"><i class="${btn.icon}" style="color:${btn.color}"></i> ${displayName}</div>`;
    });

    $html.append(`<div class="bg3-approval-hud-btn" title="表达态度"><i class="fas fa-masks-theater"></i><div class="bg3-approval-menu">${menuHtml}</div></div>`);

    $html.find(".bg3-approval-option").click((e) => {
        e.preventDefault(); e.stopPropagation();
        const btn = $(e.currentTarget);
        const text = btn.data("text");
        const color = btn.data("color");
        
        renderToast(token.name, token.document.texture.src, text, color);
        
        game.socket.emit(`module.${MOD_ID}`, {
            operation: "showNotification",
            name: token.name,
            img: token.document.texture.src,
            text: text,
            color: color
        });
    });
});

/**
 * 核心：伪装容器
 * 我们利用 .image-popout 和 .window-content 这两个 MCD 白名单类
 * 来创建一个“隐形”的合法窗口，从而避开 MCD 的隐藏机制
 */
function ensureContainer() {
    let container = document.getElementById("bg3-notification-container");
    if (!container) {
        // 1. 外层伪装：image-popout
        container = document.createElement("div");
        container.id = "bg3-notification-container";
        // 添加 image-popout 类，骗过 MCD 的父级隐藏规则
        container.className = "image-popout"; 
        
        // 强行覆盖样式，把 Foundry 默认的窗口样式（背景、阴影）全部去掉
        container.style.cssText = `
            position: fixed !important;
            top: 100px !important;
            left: 120px !important;
            width: auto !important;
            height: auto !important;
            z-index: 2147483647 !important;
            pointer-events: none !important;
            background: none !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            overflow: visible !important;
            min-height: 0 !important;
            min-width: 0 !important;
        `;

        // 2. 内层伪装：window-content
        // MCD 规定 .image-popout 里的子元素必须是 .window-content 才能显示
        const content = document.createElement("div");
        content.id = "bg3-notification-content";
        content.className = "window-content";
        content.style.cssText = `
            background: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
        `;

        container.appendChild(content);
        document.body.appendChild(container);
    }
    return document.getElementById("bg3-notification-content");
}

function renderToast(name, img, text, color) {
    const container = ensureContainer();
    const duration = game.settings.get(MOD_ID, "duration") || 4000;

    const toast = document.createElement("div");
    toast.className = "bg3-toast";
    toast.style.borderLeftColor = color;
    
    // 样式写在 CSS 里或者这里都行，这里为了保险加上 !important
    toast.style.cssText = `
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        background: linear-gradient(90deg, rgba(16, 16, 16, 0.98), rgba(30, 30, 30, 0.95)) !important;
        border: 1px solid #5c5c5c !important;
        border-left: 6px solid ${color} !important;
        padding: 6px 10px !important;
        box-shadow: 0 4px 15px rgba(0,0,0,0.9) !important;
        border-radius: 3px !important;
        width: max-content !important;
        pointer-events: none !important;
        visibility: visible !important;
    `;

    toast.innerHTML = `
        <img src="${img}" style="width:48px;height:48px;border-radius:4px;border:1px solid #9a9a91;object-fit:cover;flex-shrink:0;display:block;" onerror="this.style.display='none'"/>
        <div style="display:flex;flex-direction:column;justify-content:center;">
            <div style="font-weight:bold;font-size:12px;color:#aaa;line-height:1.2;">${name}</div>
            <div style="font-weight:900;font-size:20px;letter-spacing:0.5px;line-height:1.2;text-shadow:0 0 2px rgba(0,0,0,0.5);color:${color};">${text}</div>
        </div>
    `;

    // 插入到 window-content 这一层
    container.appendChild(toast);

    // 动画
    const enter = toast.animate([
        { opacity: 0, transform: 'translateX(-50px)' },
        { opacity: 1, transform: 'translateX(0)' }
    ], { duration: 300, fill: 'forwards', easing: 'ease-out' });

    setTimeout(() => {
        if (!toast.isConnected) return;
        const exit = toast.animate([
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(-20px)' }
        ], { duration: 500, fill: 'forwards', easing: 'ease-in' });
        
        exit.onfinish = () => {
            if (toast.parentNode) toast.remove();
        };
    }, duration);
}