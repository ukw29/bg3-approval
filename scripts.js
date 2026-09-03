const MOD_ID = "bg3-approval";
const SETTINGS_VERSION = 3;

const ACTIONS = [
    { key: "approve", icon: "fas fa-thumbs-up", color: "#4eff4e" },
    { key: "disapprove", icon: "fas fa-thumbs-down", color: "#ff4e4e" },
    { key: "laugh", icon: "fas fa-grin-beam-sweat", color: "#ffc107" }
];

const DEFAULT_CUSTOM_ICON = "fas fa-comment";
const DEFAULT_CUSTOM_COLOR = "#f5f5f5";

const i18n = key => game.i18n.localize(`${MOD_ID}.${key}`);

function defaultActions() {
    return ACTIONS.map(action => ({
        ...action,
        label: i18n(`actions.${action.key}`),
        text: i18n(`actions.${action.key}`)
    }));
}

function parseLegacyActions() {
    try {
        const value = JSON.parse(game.settings.get(MOD_ID, "buttonConfig"));
        return Array.isArray(value) && value.length ? value : defaultActions();
    } catch {
        return defaultActions();
    }
}

function createCustomActionId() {
    return globalThis.foundry?.utils?.randomID?.()
        ?? globalThis.crypto?.randomUUID?.()
        ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeIcon(value) {
    const icon = String(value ?? "").split(/\s+/).filter(name => /^[\w-]+$/.test(name)).join(" ");
    return icon || DEFAULT_CUSTOM_ICON;
}

function sanitizeColor(value) {
    const color = String(value ?? "").trim();
    if (/^#[0-9a-f]{6}$/i.test(color)) return color;
    if (/^#[0-9a-f]{3}$/i.test(color)) {
        return `#${color.slice(1).split("").map(character => character.repeat(2)).join("")}`;
    }
    return DEFAULT_CUSTOM_COLOR;
}

function normalizeCustomActions(value) {
    if (!Array.isArray(value)) return [];
    const ids = new Set();
    return value.map((action, index) => {
        let id = String(action?.id ?? `custom-${index + 1}`).replace(/[^\w-]/g, "") || `custom-${index + 1}`;
        const baseId = id;
        let suffix = 2;
        while (ids.has(id)) id = `${baseId}-${suffix++}`;
        ids.add(id);

        const fallback = String(action?.label ?? action?.text ?? "").trim().slice(0, 100)
            || `${i18n("settings.customActions.fallbackLabel")} ${index + 1}`;
        return {
            id,
            label: fallback,
            text: String(action?.text ?? fallback).trim().slice(0, 500) || fallback,
            icon: sanitizeIcon(action?.icon),
            color: sanitizeColor(action?.color)
        };
    });
}

function getCustomActions() {
    try {
        return normalizeCustomActions(JSON.parse(game.settings.get(MOD_ID, "customActions") || "[]"));
    } catch {
        return [];
    }
}

function getActions() {
    const legacy = parseLegacyActions();
    const defaults = ACTIONS.map((base, index) => {
        const old = legacy[index] ?? {};
        return {
            icon: old.icon || base.icon,
            color: old.color || base.color,
            label: game.settings.get(MOD_ID, `${base.key}Label`) || old.label || old.text || i18n(`actions.${base.key}`),
            text: game.settings.get(MOD_ID, `${base.key}Text`) || old.text || old.label || i18n(`actions.${base.key}`)
        };
    });
    return [...defaults, ...getCustomActions()];
}

function refreshWidget() {
    const root = document.getElementById("bg3-widget-root");
    root?.bg3Cleanup?.();
    root?.remove();
    if (game.ready && game.settings.get(MOD_ID, "showWidget")) createWidget();
}

function refreshHUD() {
    document.querySelectorAll(".bg3-approval-hud-btn").forEach(element => element.remove());
    const hud = canvas?.hud?.token;
    if (!hud?.rendered) return;
    const html = hud.element instanceof HTMLElement ? hud.element : hud.element?.[0];
    renderApprovalTokenHUD(hud, html);
}

function refreshActionsUI() {
    refreshWidget();
    refreshHUD();
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class CustomActionsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);
        this.actions = getCustomActions().map(action => ({ ...action }));
        this.editingId = null;
    }

    static DEFAULT_OPTIONS = {
        id: "bg3-custom-actions-config",
        classes: ["bg3-custom-actions-window"],
        tag: "form",
        position: { width: 520 },
        window: { icon: "fas fa-list", resizable: false },
        form: {
            closeOnSubmit: false,
            handler: this._onSubmit
        },
        actions: {
            add: this._onAdd,
            edit: this._onEdit,
            delete: this._onDelete,
            moveUp: this._onMoveUp,
            moveDown: this._onMoveDown,
            cancel: this._onCancel
        }
    };

    static PARTS = {
        main: { template: `modules/${MOD_ID}/custom-actions.hbs` }
    };

    get title() {
        return i18n("settings.customActions.menu.name");
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        return {
            ...context,
            actions: this.actions.map((action, index) => ({
                ...action,
                number: index + 1,
                editing: action.id === this.editingId,
                canMoveUp: index > 0,
                canMoveDown: index < this.actions.length - 1
            })),
            hasActions: this.actions.length > 0
        };
    }

    _captureEditor() {
        if (!this.editingId || !this.element) return;
        const editor = this.element.querySelector(`.bg3-custom-action-editor[data-action-id="${CSS.escape(this.editingId)}"]`);
        const action = this.actions.find(item => item.id === this.editingId);
        if (!editor || !action) return;
        action.label = String(editor.querySelector('[data-field="label"]')?.value ?? "").trim().slice(0, 100);
        action.text = String(editor.querySelector('[data-field="text"]')?.value ?? "").trim().slice(0, 500);
        action.icon = sanitizeIcon(editor.querySelector('[data-field="icon"]')?.value);
        action.color = sanitizeColor(editor.querySelector('[data-field="color"]')?.value);
    }

    async _rerender() {
        await this.render({ force: true });
    }

    static async _onAdd() {
        this._captureEditor();
        const id = createCustomActionId();
        const label = i18n("settings.customActions.newActionLabel");
        this.actions.push({ id, label, text: label, icon: DEFAULT_CUSTOM_ICON, color: DEFAULT_CUSTOM_COLOR });
        this.editingId = id;
        await this._rerender();
    }

    static async _onEdit(_event, target) {
        this._captureEditor();
        this.editingId = target.dataset.id;
        await this._rerender();
    }

    static async _onDelete(_event, target) {
        this._captureEditor();
        const id = target.dataset.id;
        this.actions = this.actions.filter(action => action.id !== id);
        if (this.editingId === id) this.editingId = null;
        await this._rerender();
    }

    static async _onMoveUp(_event, target) {
        this._captureEditor();
        const index = this.actions.findIndex(action => action.id === target.dataset.id);
        if (index > 0) [this.actions[index - 1], this.actions[index]] = [this.actions[index], this.actions[index - 1]];
        await this._rerender();
    }

    static async _onMoveDown(_event, target) {
        this._captureEditor();
        const index = this.actions.findIndex(action => action.id === target.dataset.id);
        if (index >= 0 && index < this.actions.length - 1) {
            [this.actions[index], this.actions[index + 1]] = [this.actions[index + 1], this.actions[index]];
        }
        await this._rerender();
    }

    static async _onCancel() {
        await this.close();
    }

    static async _onSubmit() {
        this._captureEditor();
        const invalid = this.actions.find(action => !action.label || !action.text);
        if (invalid) {
            this.editingId = invalid.id;
            await this._rerender();
            ui.notifications.error(i18n("settings.customActions.validation.required"));
            return;
        }

        const actions = normalizeCustomActions(this.actions);
        await game.settings.set(MOD_ID, "customActions", JSON.stringify(actions));
        ui.notifications.info(i18n("settings.customActions.saved"));
        await this.close();
    }
}

Hooks.once("init", () => {
    game.settings.register(MOD_ID, "buttonConfig", {
        scope: "world",
        config: false,
        type: String,
        default: JSON.stringify(defaultActions(), null, 2)
    });
    game.settings.register(MOD_ID, "settingsVersion", {
        scope: "world",
        config: false,
        type: Number,
        default: 0
    });
    game.settings.register(MOD_ID, "customActions", {
        scope: "world",
        config: false,
        type: String,
        default: "[]",
        onChange: refreshActionsUI
    });
    game.settings.registerMenu(MOD_ID, "customActionsMenu", {
        name: i18n("settings.customActions.menu.name"),
        label: i18n("settings.customActions.menu.label"),
        hint: i18n("settings.customActions.menu.hint"),
        icon: "fas fa-list",
        type: CustomActionsConfig,
        restricted: true
    });

    for (const action of ACTIONS) {
        const fallback = i18n(`actions.${action.key}`);
        game.settings.register(MOD_ID, `${action.key}Label`, {
            name: i18n(`settings.${action.key}Label.name`),
            hint: i18n("settings.actionLabel.hint"),
            scope: "world",
            config: true,
            type: String,
            default: fallback,
            onChange: refreshActionsUI
        });
        game.settings.register(MOD_ID, `${action.key}Text`, {
            name: i18n(`settings.${action.key}Text.name`),
            hint: i18n("settings.actionText.hint"),
            scope: "world",
            config: true,
            type: String,
            default: fallback,
            onChange: refreshActionsUI
        });
    }

    game.settings.register(MOD_ID, "duration", {
        name: i18n("settings.duration.name"),
        hint: i18n("settings.duration.hint"),
        scope: "world",
        config: true,
        type: Number,
        range: { min: 500, max: 30000, step: 500 },
        default: 4000
    });
    game.settings.register(MOD_ID, "showWidget", {
        name: i18n("settings.showWidget.name"),
        hint: i18n("settings.showWidget.hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: refreshWidget
    });
    game.settings.register(MOD_ID, "showTokenHUD", {
        name: i18n("settings.showTokenHUD.name"),
        hint: i18n("settings.showTokenHUD.hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: refreshHUD
    });
    game.settings.register(MOD_ID, "widgetPos", {
        scope: "client",
        config: false,
        type: Object,
        default: { top: 100, left: 100 }
    });

    game.settings.register(MOD_ID, "toastPosition", {
        name: i18n("settings.toastPosition.name"),
        hint: i18n("settings.toastPosition.hint"),
        scope: "client",
        config: true,
        type: String,
        choices: Object.fromEntries(["custom", "top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"]
            .map(position => [position, i18n(`positions.${position}`)])),
        default: "custom",
        onChange: () => updateContainerLayout()
    });
    game.settings.register(MOD_ID, "toastOffsetX", {
        name: i18n("settings.toastOffsetX.name"),
        hint: i18n("settings.toastOffsetX.hint"),
        scope: "client",
        config: true,
        type: Number,
        default: 120,
        onChange: () => updateContainerLayout()
    });
    game.settings.register(MOD_ID, "toastOffsetY", {
        name: i18n("settings.toastOffsetY.name"),
        hint: i18n("settings.toastOffsetY.hint"),
        scope: "client",
        config: true,
        type: Number,
        default: 100,
        onChange: () => updateContainerLayout()
    });
});

Hooks.once("ready", async () => {
    await migrateLegacySettings();
    ensureContainer();
    if (game.settings.get(MOD_ID, "showWidget")) createWidget();

    game.socket.on(`module.${MOD_ID}`, payload => {
        if (payload?.operation === "showNotification") {
            renderToast(payload.name, payload.img, payload.text, payload.color, payload.speakerType);
        }
    });

    window.addEventListener("resize", () => {
        updateContainerLayout();
        keepWidgetOnScreen();
    });
});

async function migrateLegacySettings() {
    if (!game.user.isGM || game.settings.get(MOD_ID, "settingsVersion") >= SETTINGS_VERSION) return;
    const version = game.settings.get(MOD_ID, "settingsVersion");
    const legacy = parseLegacyActions();
    if (version < 2) {
        for (const [index, action] of ACTIONS.entries()) {
            const old = legacy[index] ?? {};
            const fallback = i18n(`actions.${action.key}`);
            await game.settings.set(MOD_ID, `${action.key}Label`, old.label || old.text || fallback);
            await game.settings.set(MOD_ID, `${action.key}Text`, old.text || old.label || fallback);
        }
    }
    if (version < 3 && !getCustomActions().length && legacy.length > ACTIONS.length) {
        const extras = normalizeCustomActions(legacy.slice(ACTIONS.length));
        await game.settings.set(MOD_ID, "customActions", JSON.stringify(extras));
    }
    await game.settings.set(MOD_ID, "settingsVersion", SETTINGS_VERSION);
}

function promoteToTopLayer(element) {
    if (typeof element.showPopover !== "function") return;
    element.setAttribute("popover", "manual");
    try {
        if (element.matches(":popover-open")) element.hidePopover();
        element.showPopover();
    } catch {
        element.removeAttribute("popover");
        // Maximum z-index remains as the compatibility fallback.
    }
}

function createIcon(classNames) {
    const icon = document.createElement("i");
    icon.className = String(classNames).split(/\s+/).filter(name => /^[\w-]+$/.test(name)).join(" ");
    return icon;
}

function createWidget() {
    if (document.getElementById("bg3-widget-root")) return;

    const buttons = getActions();
    const initialPos = game.settings.get(MOD_ID, "widgetPos") || { top: 100, left: 100 };
    const root = document.createElement("div");
    root.id = "bg3-widget-root";
    root.style.top = `${Number(initialPos.top) || 0}px`;
    root.style.left = `${Number(initialPos.left) || 0}px`;

    const mainBtn = document.createElement("button");
    mainBtn.type = "button";
    mainBtn.className = "bg3-widget-main";
    mainBtn.title = i18n("widget.title");
    mainBtn.setAttribute("aria-label", i18n("widget.title"));
    mainBtn.appendChild(createIcon("fas fa-hand-paper"));

    const menu = document.createElement("div");
    menu.className = "bg3-widget-menu";
    for (const action of buttons) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "bg3-widget-action";
        item.title = action.label;
        item.setAttribute("aria-label", action.label);
        item.style.setProperty("--bg3-action-color", action.color);
        item.appendChild(createIcon(action.icon));
        item.addEventListener("click", event => {
            event.stopPropagation();
            handleAction(action.text, action.color);
        });
        menu.appendChild(item);
    }

    root.append(mainBtn, menu);
    document.body.appendChild(root);
    promoteToTopLayer(root);
    keepWidgetOnScreen();

    let dragging = false;
    let hovering = false;
    let menuOpen = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const updateVisuals = () => {
        root.classList.toggle("is-active", menuOpen || dragging || hovering);
        root.classList.toggle("is-open", menuOpen);
    };
    const toggleMenu = force => {
        menuOpen = force ?? !menuOpen;
        updateVisuals();
    };
    const closeOutside = event => {
        if (!root.contains(event.target)) toggleMenu(false);
    };

    root.addEventListener("mouseenter", () => {
        hovering = true;
        promoteToTopLayer(root);
        updateVisuals();
    });
    root.addEventListener("mouseleave", () => {
        hovering = false;
        updateVisuals();
    });
    document.addEventListener("pointerdown", closeOutside);
    root.bg3Cleanup = () => document.removeEventListener("pointerdown", closeOutside);

    mainBtn.addEventListener("pointerdown", event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        promoteToTopLayer(root);
        dragging = false;
        startX = event.clientX;
        startY = event.clientY;
        initialLeft = root.offsetLeft;
        initialTop = root.offsetTop;
        mainBtn.setPointerCapture?.(event.pointerId);

        const onMove = moveEvent => {
            if (Math.abs(moveEvent.clientX - startX) > 3 || Math.abs(moveEvent.clientY - startY) > 3) {
                dragging = true;
                toggleMenu(false);
                root.style.left = `${initialLeft + moveEvent.clientX - startX}px`;
                root.style.top = `${initialTop + moveEvent.clientY - startY}px`;
            }
            updateVisuals();
        };
        const onUp = () => {
            mainBtn.removeEventListener("pointermove", onMove);
            mainBtn.removeEventListener("pointerup", onUp);
            mainBtn.removeEventListener("pointercancel", onUp);
            keepWidgetOnScreen();
            if (dragging) {
                game.settings.set(MOD_ID, "widgetPos", { left: root.offsetLeft, top: root.offsetTop });
            } else {
                toggleMenu();
            }
            dragging = false;
            updateVisuals();
        };
        mainBtn.addEventListener("pointermove", onMove);
        mainBtn.addEventListener("pointerup", onUp);
        mainBtn.addEventListener("pointercancel", onUp);
        updateVisuals();
    });
}

function keepWidgetOnScreen() {
    const root = document.getElementById("bg3-widget-root");
    if (!root) return;
    const maxLeft = Math.max(0, window.innerWidth - root.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - root.offsetHeight);
    root.style.left = `${Math.min(Math.max(0, root.offsetLeft), maxLeft)}px`;
    root.style.top = `${Math.min(Math.max(0, root.offsetTop), maxTop)}px`;
}

function renderApprovalTokenHUD(app, html) {
    if (!game.settings.get(MOD_ID, "showTokenHUD")) return;
    const token = app.object;
    if (!(token?.document?.isOwner ?? token?.isOwner)) return;

    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!(root instanceof HTMLElement) || root.querySelector(".bg3-approval-hud-btn")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "bg3-approval-hud-btn";
    wrapper.title = i18n("hud.title");
    wrapper.appendChild(createIcon("fas fa-hand-paper"));

    const menu = document.createElement("div");
    menu.className = "bg3-approval-menu";
    for (const action of getActions()) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "bg3-approval-option";
        option.style.setProperty("--bg3-action-color", action.color);
        option.title = action.label;
        option.setAttribute("aria-label", action.label);
        const label = document.createElement("span");
        label.className = "bg3-approval-option-label";
        label.textContent = action.label;
        option.append(createIcon(action.icon), label);
        option.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            handleAction(action.text, action.color);
        });
        menu.appendChild(option);
    }
    wrapper.appendChild(menu);
    root.appendChild(wrapper);
}

Hooks.on("renderTokenHUD", renderApprovalTokenHUD);

function handleAction(text, color) {
    const controlled = canvas.tokens?.controlled?.[0];
    const speakerType = controlled ? "pc" : "pl";
    const name = controlled ? controlled.name : game.user.name;
    const img = controlled ? controlled.document?.texture?.src : null;

    if (!name) {
        ui.notifications.warn(i18n("warnings.selectToken"));
        return;
    }

    renderToast(name, img, text, color, speakerType);
    game.socket.emit(`module.${MOD_ID}`, {
        operation: "showNotification",
        speakerType,
        name,
        img,
        text,
        color
    });
}

function ensureContainer() {
    let container = document.getElementById("bg3-notification-container");
    if (!container) {
        container = document.createElement("section");
        container.id = "bg3-notification-container";
        container.setAttribute("aria-live", "polite");
        container.setAttribute("aria-atomic", "false");

        const content = document.createElement("div");
        content.id = "bg3-notification-content";
        container.appendChild(content);
        document.body.appendChild(container);
    }
    updateContainerLayout(container);
    promoteToTopLayer(container);
    return container.querySelector("#bg3-notification-content");
}

function updateContainerLayout(container = document.getElementById("bg3-notification-container")) {
    if (!(container instanceof HTMLElement)) container = document.getElementById("bg3-notification-container");
    if (!container || !game.ready) return;
    const position = game.settings.get(MOD_ID, "toastPosition");
    const x = Number(game.settings.get(MOD_ID, "toastOffsetX")) || 0;
    const y = Number(game.settings.get(MOD_ID, "toastOffsetY")) || 0;
    const content = container.querySelector("#bg3-notification-content");
    if (!content) return;

    for (const property of ["top", "right", "bottom", "left", "transform"]) container.style[property] = "";
    const [vertical, horizontal] = position === "custom" ? ["top", "left"] : position.split("-");
    const isBottom = vertical === "bottom";

    if (position === "custom") {
        container.style.left = `${x}px`;
        container.style.top = `${y}px`;
    } else {
        container.style[vertical] = `${Math.max(0, 16 + (isBottom ? -y : y))}px`;
        if (horizontal === "center") {
            container.style.left = `calc(50% + ${x}px)`;
            container.style.transform = "translateX(-50%)";
        } else {
            container.style[horizontal] = `${Math.max(0, 16 + (horizontal === "right" ? -x : x))}px`;
        }
    }

    content.style.alignItems = horizontal === "center" ? "center" : horizontal === "right" ? "flex-end" : "flex-start";
    content.style.flexDirection = isBottom ? "column-reverse" : "column";
}

function renderToast(name, img, text, color, speakerType = "pc") {
    const content = ensureContainer();
    const duration = Math.max(500, Number(game.settings.get(MOD_ID, "duration")) || 4000);
    const toast = document.createElement("div");
    toast.className = `bg3-approval-toast${speakerType === "pl" ? " is-player" : ""}`;
    toast.style.setProperty("--bg3-action-color", color || "#f5f5f5");

    if (speakerType !== "pl" && img) {
        const portrait = document.createElement("img");
        portrait.className = "bg3-toast-portrait";
        portrait.src = img;
        portrait.alt = "";
        portrait.addEventListener("error", () => portrait.remove(), { once: true });
        toast.appendChild(portrait);
    }

    const copy = document.createElement("div");
    copy.className = "bg3-toast-copy";
    const actorName = document.createElement("div");
    actorName.className = "bg3-toast-name";
    actorName.textContent = String(name ?? "").slice(0, 200);
    const message = document.createElement("div");
    message.className = "bg3-toast-message";
    message.textContent = String(text ?? "").slice(0, 500);
    copy.append(actorName, message);
    toast.appendChild(copy);
    content.appendChild(toast);

    toast.animate(
        [{ opacity: 0, transform: "translateX(-50px)" }, { opacity: 1, transform: "translateX(0)" }],
        { duration: 300, fill: "forwards", easing: "ease-out" }
    );
    setTimeout(() => {
        if (!toast.isConnected) return;
        const animation = toast.animate(
            [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-20px)" }],
            { duration: 500, fill: "forwards", easing: "ease-in" }
        );
        animation.onfinish = () => toast.remove();
    }, duration);
}
