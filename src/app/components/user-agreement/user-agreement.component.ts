import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';

@Component({
    selector: 'app-user-agreement',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './user-agreement.component.html',
    styleUrls: ['./user-agreement.component.css']
})
export class UserAgreementComponent {
    private settingsService = inject(SettingsService);

    visible = () => !this.settingsService.userAgreementAccepted();
    showAutostartPrompt = signal(false);

    onAccept() {
        this.settingsService.acceptUserAgreement();
        this.showAutostartPrompt.set(true);
    }

    async onAutostartChoice(enable: boolean) {
        if (enable) {
            await this.settingsService.setAutostart(true);
        }
        this.showAutostartPrompt.set(false);
    }
}
