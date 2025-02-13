/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const CommandTimer = GObject.registerClass(
class CommandTimer extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Command Timer'));

        this.add_child(new St.Icon({
            icon_name: 'timer-symbolic',
            style_class: 'system-status-icon',
        }));

        let delayItem = new PopupMenu.PopupMenuItem(_('Set Delay (s):'));
        delayItem.reactive = false;
        this.menu.addMenuItem(delayItem);

        this.delayEntry = new St.Entry({
            text: '5',
            x_expand: true,
            y_expand: true
        });
        delayItem.add_child(this.delayEntry);

        let commandItem = new PopupMenu.PopupMenuItem(_('Set Command:'));
        commandItem.reactive = false;
        this.menu.addMenuItem(commandItem);

        this.commandEntry = new St.Entry({
            text: 'echo "Hello, World!"',
            x_expand: true,
            y_expand: true
        });
        commandItem.add_child(this.commandEntry);

        this.pendingCommands = [];

        let executeItem = new PopupMenu.PopupMenuItem(_('Execute Command'));
        executeItem.connect('activate', () => {
            let delay = parseInt(this.delayEntry.get_text(), 10);
            let command = this.commandEntry.get_text();

            let remainingTime = delay;
            let countdownId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                remainingTime -= 1;
                let commandItem = this.pendingCommands.find(cmd => cmd.command === command);
                if (commandItem) {
                    commandItem.remainingTime = remainingTime;
                    this.updatePendingCommandsList();
                }
                console.log("Update timer: ", command, remainingTime);
                if (remainingTime <= 0) {
                    try {
                        GLib.spawn_command_line_async(command);
                        Main.notify('Command Timer', `"${command}" executed after ${delay} s!`);
                    } catch (error) {
                        Main.notify('Command Timer', `Failed to execute "${command}": ${error.message}`);
                    }
                    // Remove the command from the pending list and clean up the timeout
                    this.pendingCommands = this.pendingCommands.filter(cmd => cmd.command !== command);
                    GLib.source_remove(countdownId);
                    this.updatePendingCommandsList();
                    return false;
                }
                return true;
            });

            this.pendingCommands.push({ command, delay, countdownId, remainingTime });
            this.updatePendingCommandsList();
        });
        this.menu.addMenuItem(executeItem);

        this.pendingCommandsItem = new PopupMenu.PopupMenuItem(_('Pending Commands:'));
        this.pendingCommandsItem.reactive = false;
        this.menu.addMenuItem(this.pendingCommandsItem);

        this.pendingCommandsList = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true
        });
        this.pendingCommandsItem.add_child(this.pendingCommandsList);
    }

    updatePendingCommandsList() {
        this.pendingCommandsList.destroy_all_children();
        this.pendingCommands.forEach(cmd => {
            let cmdItem = new PopupMenu.PopupMenuItem(`${cmd.command} (${cmd.remainingTime} s)`);
            cmdItem.reactive = false;
            this.pendingCommandsList.add_child(cmdItem);
        });
    }

    destroy() {
        // Clean up all pending timeouts
        this.pendingCommands.forEach(cmd => {
            if (cmd.countdownId) {
                GLib.source_remove(cmd.countdownId);
            }
        });
        super.destroy();
    }
});

export default class CommandTimerExtension extends Extension {
    enable() {
        this._indicator = new CommandTimer();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}
