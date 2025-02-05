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

        this.countdownItem = new PopupMenu.PopupMenuItem(_('Time Remaining:'));
        this.countdownItem.reactive = false;
        this.menu.addMenuItem(this.countdownItem);

        this.countdownLabel = new St.Label({
            text: '0 s',
            x_expand: true,
            y_expand: true
        });
        this.countdownItem.add_child(this.countdownLabel);

        let executeItem = new PopupMenu.PopupMenuItem(_('Execute Command'));
        executeItem.connect('activate', () => {
            let delay = parseInt(this.delayEntry.get_text(), 10);
            let command = this.commandEntry.get_text();

            let remainingTime = delay;
            let countdownId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                remainingTime -= 1;
                this.countdownLabel.set_text(`${remainingTime} s`);
                if (remainingTime <= 0) {
                    GLib.spawn_command_line_async(command);
                    Main.notify(`Command executed after ${delay} m!`);
                    return false;
                }
                return true;
            });
        });
        this.menu.addMenuItem(executeItem);
    }
});

export default class CommandTimerExampleExtension extends Extension {
    enable() {
        this._indicator = new CommandTimer();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

