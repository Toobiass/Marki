import { Component, inject, computed } from '@angular/core';
import { EditorService } from '../../services/editor.service';

@Component({
  selector: 'app-title-bar',
  standalone: true,
  imports: [],
  templateUrl: './title-bar.component.html',
  styleUrls: ['./title-bar.component.css']
})
export class TitleBarComponent {
  editorService = inject(EditorService);
  readonly MAX_TITLE_LEN = 20;

  displayPath = computed(() => {
    const path = this.editorService.filePath();
    if (!path) return null;
    const parts = path.replace(/\\/g, '/').split('/');
    const name = parts[parts.length - 1] || path;
    return name.length > this.MAX_TITLE_LEN ? name.slice(0, this.MAX_TITLE_LEN) + '…' : name;
  });
}
