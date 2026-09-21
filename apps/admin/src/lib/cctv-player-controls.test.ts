import assert from 'node:assert/strict';
import { getVisibleControls } from './cctv-player-controls';

const base = {
  isExpanded: false,
  isFullscreen: false,
  isHovered: false,
  isFocused: false,
  isTouchRevealed: false,
  isTouchDevice: false,
  containerWidth: 320,
};

// Tiny tile → expand only, always peekable
{
  const v = getVisibleControls({ ...base, containerWidth: 90 });
  assert.deepEqual(v.controls, ['expand']);
  assert.equal(v.toolbarVisible, true);
  assert.equal(v.density, 'minimal');
}

// Small tile idle → expand peek, secondary hidden until hover
{
  const idle = getVisibleControls({ ...base, containerWidth: 220 });
  assert.ok(idle.controls.includes('expand'));
  assert.equal(idle.toolbarVisible, false);
  assert.equal(idle.peekExpand, true);

  const hovered = getVisibleControls({ ...base, containerWidth: 220, isHovered: true });
  assert.equal(hovered.toolbarVisible, true);
  assert.ok(hovered.controls.length >= 2);
  assert.ok(!hovered.controls.includes('play'));
}

// Featured / expanded gets play when wide enough
{
  const v = getVisibleControls({
    ...base,
    isExpanded: true,
    isHovered: true,
    containerWidth: 420,
  });
  assert.ok(v.controls.includes('play'));
  assert.ok(v.controls.includes('record'));
}

// Fullscreen always space-aware but interaction-gated
{
  const idle = getVisibleControls({
    ...base,
    isFullscreen: true,
    containerWidth: 800,
  });
  assert.equal(idle.toolbarVisible, false);
  assert.ok(idle.controls.includes('play'));

  const open = getVisibleControls({
    ...base,
    isFullscreen: true,
    isHovered: true,
    containerWidth: 800,
  });
  assert.equal(open.toolbarVisible, true);
}

// Width squeeze drops secondary before expand
{
  const v = getVisibleControls({
    ...base,
    isHovered: true,
    containerWidth: 70,
  });
  assert.deepEqual(v.controls, ['expand']);
}

console.log('cctv-player-controls: ok');
