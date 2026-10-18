import assert from 'node:assert/strict';
import {
  formatPlaybackSpeed,
  getVisibleControls,
  nextFastForwardSpeed,
  nextPlaybackSpeed,
} from './cctv-player-controls';

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
  assert.ok(hovered.controls.includes('mute'));
  assert.ok(hovered.controls.includes('mini'));
  assert.ok(!hovered.controls.includes('play'));
}

// Featured / expanded gets play + rewind + forward when wide enough
{
  const v = getVisibleControls({
    ...base,
    isExpanded: true,
    isHovered: true,
    containerWidth: 420,
  });
  assert.ok(v.controls.includes('play'));
  assert.ok(v.controls.includes('rewind'));
  assert.ok(v.controls.includes('forward'));
  assert.ok(v.controls.includes('record'));
  assert.ok(!v.controls.includes('speed'));
  assert.ok(!v.controls.includes('live'));
}

// Playback mode exposes speed + return-to-live + fast forward
{
  const v = getVisibleControls({
    ...base,
    isExpanded: true,
    isHovered: true,
    isPlayback: true,
    containerWidth: 480,
  });
  assert.ok(v.controls.includes('rewind'));
  assert.ok(v.controls.includes('forward'));
  assert.ok(v.controls.includes('speed'));
  assert.ok(v.controls.includes('live'));
  assert.ok(!v.controls.includes('record'));
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
  assert.ok(idle.controls.includes('rewind'));
  assert.ok(idle.controls.includes('forward'));

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

{
  assert.equal(nextPlaybackSpeed(0.5), 1);
  assert.equal(nextPlaybackSpeed(1), 2);
  assert.equal(nextPlaybackSpeed(8), 0.5);
  assert.equal(nextFastForwardSpeed(1), 2);
  assert.equal(nextFastForwardSpeed(2), 4);
  assert.equal(nextFastForwardSpeed(8), 2);
  assert.equal(formatPlaybackSpeed(2, false), '2×');
  assert.equal(formatPlaybackSpeed(2, true), '−2×');
}

console.log('cctv-player-controls: ok');
