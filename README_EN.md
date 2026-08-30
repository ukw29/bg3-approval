# BG3 Style Approval

[简体中文](./README.md) | [English](./README_EN.md)

> **A Note on AI**
>
> AI assisted with parts of the code and documentation. Every published change is reviewed, revised, and accepted by the maintainer. AI improves efficiency; judgment and responsibility remain human.

A Baldur's Gate 3-style approval and reaction module for Foundry VTT.

## Compatibility

- Languages: Simplified Chinese and English
- Foundry VTT: v13 and v14
- Tested systems: D&D and Pathfinder 2e (PF2e)
- Other game systems have not been tested

## Features

- Send reactions from a draggable floating button or the Token HUD.
- With a Token selected, the reaction uses that character's name and Token portrait.
- Without a Token selected, the reaction uses the current player's ID and omits the generic player avatar.
- Reactions are shown to other connected players in the current world.
- Notification text, duration, and screen position can be customized.
- Notifications use a high display layer to reduce interference from other module interfaces.

## Usage

1. Install and enable the module.
2. Click the floating button and choose a reaction.
3. Send with a Token selected for a character reaction, or without one for a player reaction.
4. Enable the Token HUD button in the module settings if needed.

## Customization

Menu labels, notification text, duration, position, and button visibility can be changed directly in the module settings. Routine changes do not require code editing.

To add more reactions, replace icons, or change colors, users with basic JavaScript knowledge may edit `scripts.js` after making a backup.

## Project

[ukw29/bg3-approval](https://github.com/ukw29/bg3-approval)
