声明：本mod大部分代码由AI生成！

仿博德之门3风格的表态mod，目前适配v13和v14版本，在DND以及PF2系统上经过测试可以运行，其他系统未测试，不推荐使用。

<img width="545" height="521" alt="image" src="https://github.com/user-attachments/assets/a157e95a-bfbd-4b62-91af-4cd1a47b68aa" />

#1 多种按钮显示方式：Token HUD 与 悬浮球（通过设置修改）
<img width="1299" height="428" alt="image" src="https://github.com/user-attachments/assets/925799f5-8970-4c38-ac1f-ffa6ca725832" />


#2 自定义悬停时长、显示内容、显示图标等（不建议通过设置修改，建议通过 scripts.js 文件修改）
<img width="911" height="536" alt="image" src="https://github.com/user-attachments/assets/6c33462d-bbee-4992-8113-91dab5f7e931" />
可以自定义内容、图标、颜色

# BG3 Style Approval

> **AI 需知**
>
> 本项目在 AI 辅助下完成了部分代码与文档整理；所有发布内容均由维护者逐项检查、修订并验收。AI 提供效率，最终判断与责任始终属于人。

一款用于 Foundry VTT 的《博德之门 3》风格表态模组。

## 适配范围

- 界面语言：简体中文、英文
- Foundry VTT：v13、v14
- 已测试系统：D&D、Pathfinder 2e（PF2e）
- 其他游戏系统尚未测试

## 功能

- 通过可拖动悬浮球或 Token HUD 快速表态。
- 选中 Token 时，由该 Token 代表的角色表态，并显示 Token 头像。
- 未选中 Token 时，由当前玩家表态，不显示通用玩家头像，并突出玩家 ID。
- 表态会同步显示给当前世界中的其他在线玩家。
- 可调整通知文字、停留时间和显示位置。
- 通知使用高层级显示，尽量避免被其他模组界面遮挡。

## 使用方法

1. 安装并启用本模组。
2. 点击屏幕悬浮球，选择需要发送的表态。
3. 选中 Token 后发送，视为角色表态；不选中 Token 时发送，视为玩家表态。
4. 如需使用 Token HUD 按钮，请在模组设置中启用该选项。

## 自定义

模组设置中可以直接修改菜单文字、通知文字、停留时间、显示位置及按钮显示方式，日常调整不需要修改代码。

如需增加表态数量、替换图标或调整颜色等扩展功能，请具备基础 JavaScript 知识的玩家备份文件后，再尝试修改 `scripts.js`。

## 项目地址

[ukw29/bg3-approval](https://github.com/ukw29/bg3-approval)
