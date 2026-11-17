import { WordGuessGate } from './WordGuessGate';

function startPreview(): void {
  const completed = document.getElementById('preview-finished')!;
  completed.hidden = true;
  new WordGuessGate({ onComplete: () => { completed.hidden = false; } });
}

document.getElementById('replay')!.addEventListener('click', startPreview);
(document.getElementById('movie-link') as HTMLAnchorElement).href = import.meta.env.DEV
  ? './?preview=protocol'
  : '../../../game.html?preview=protocol';
startPreview();
