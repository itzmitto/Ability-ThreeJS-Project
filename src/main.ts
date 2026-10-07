import './styles/game.css';
import { Game } from './game/Game';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing app container');
try {
  const game = new Game(root);
  game.start();
  if (import.meta.hot) import.meta.hot.dispose(() => game.dispose());
} catch (error) {
  root.textContent = `Unable to start the sandbox. ${error instanceof Error ? error.message : 'WebGL is unavailable.'}`;
  console.error(error);
}
