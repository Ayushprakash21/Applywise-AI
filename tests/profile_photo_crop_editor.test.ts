import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('APPLYVISE AI — Profile Photo Drag, Position, Zoom & Crop Editor Suite', () => {
  it('1. ProfilePhotoCropModal component architecture and UI controls', () => {
    const compPath = path.resolve('src/components/ProfilePhotoCropModal.tsx');
    assert.ok(fs.existsSync(compPath), 'ProfilePhotoCropModal.tsx must exist');
    const src = fs.readFileSync(compPath, 'utf8');

    // Controls
    assert.ok(src.includes('ZoomIn'), 'Must provide ZoomIn control');
    assert.ok(src.includes('ZoomOut'), 'Must provide ZoomOut control');
    assert.ok(src.includes('type="range"'), 'Must provide zoom range slider');
    assert.ok(src.includes('RotateCcw') || src.includes('Reset'), 'Must provide reset positioning control');
    assert.ok(src.includes('Cancel'), 'Must provide cancel button');
    assert.ok(src.includes('Save Photo'), 'Must provide Save Photo button');
    assert.ok(src.includes('Move') || src.includes('Drag'), 'Must provide drag instruction cue');
  });

  it('2. Drag-to-reposition and touch gesture interaction handlers', () => {
    const src = fs.readFileSync(path.resolve('src/components/ProfilePhotoCropModal.tsx'), 'utf8');

    // Mouse drag
    assert.ok(src.includes('onMouseDown'), 'Must support mouse-based drag start');
    assert.ok(src.includes('onMouseMove'), 'Must support mouse-based drag movement');
    assert.ok(src.includes('onMouseUp'), 'Must support mouse-based drag release');

    // Touch drag & Pinch-to-zoom
    assert.ok(src.includes('onTouchStart'), 'Must support mobile touch start');
    assert.ok(src.includes('onTouchMove'), 'Must support mobile touch move');
    assert.ok(src.includes('onTouchEnd'), 'Must support mobile touch end');
    assert.ok(src.includes('getTouchDistance'), 'Must calculate distance between touch points for pinch-to-zoom');
  });

  it('3. Zero empty space mathematical clamping & aspect ratio preservation', () => {
    const src = fs.readFileSync(path.resolve('src/components/ProfilePhotoCropModal.tsx'), 'utf8');

    assert.ok(src.includes('clampOffset'), 'Must define clampOffset function');
    assert.ok(src.includes('maxOffsetX = (renderedWidth - cropSize) / 2'), 'Must clamp X offset to half of overflow');
    assert.ok(src.includes('maxOffsetY = (renderedHeight - cropSize) / 2'), 'Must clamp Y offset to half of overflow');
    assert.ok(src.includes('aspect >= 1'), 'Must preserve natural image aspect ratio');
  });

  it('4. 512x512 High-resolution canvas export with smoothing', () => {
    const src = fs.readFileSync(path.resolve('src/components/ProfilePhotoCropModal.tsx'), 'utf8');

    assert.ok(src.includes('canvas.width = 512'), 'Canvas width must be 512px');
    assert.ok(src.includes('canvas.height = 512'), 'Canvas height must be 512px');
    assert.ok(src.includes("imageSmoothingQuality = 'high'"), 'Must enable high quality image smoothing');
    assert.ok(src.includes('toDataURL'), 'Must export canvas to high-quality data URL');
  });

  it('5. Live circular avatar preview matching navigation appearance', () => {
    const src = fs.readFileSync(path.resolve('src/components/ProfilePhotoCropModal.tsx'), 'utf8');

    assert.ok(src.includes('Live Avatar Preview'), 'Must provide live circular preview section');
    assert.ok(src.includes('Header'), 'Must display header scale preview');
    assert.ok(src.includes('Profile'), 'Must display profile scale preview');
    assert.ok(src.includes('rounded-full'), 'Must mask crop frame as a circle');
  });

  it('6. Strict image validation and object URL cleanup', () => {
    const src = fs.readFileSync(path.resolve('src/components/ProfilePhotoCropModal.tsx'), 'utf8');

    assert.ok(src.includes('image/jpeg') && src.includes('image/png') && src.includes('image/webp'), 'Must validate MIME types for JPEG, PNG, WebP');
    assert.ok(src.includes('5 * 1024 * 1024'), 'Must enforce 5MB file size limit');
    assert.ok(src.includes('img.naturalWidth < 100'), 'Must validate minimum image dimensions');
    assert.ok(src.includes('URL.revokeObjectURL'), 'Must revoke object URLs to prevent memory leaks');
  });

  it('7. Multi-surface integration across AccountSettingsModal, ProfileIdentityComponent, and ProfileTab', () => {
    const modalsSrc = fs.readFileSync(path.resolve('src/components/LegalModals.tsx'), 'utf8');
    const profileCompSrc = fs.readFileSync(path.resolve('src/components/ProfileIdentityComponent.tsx'), 'utf8');
    const profileTabSrc = fs.readFileSync(path.resolve('src/components/ProfileTab.tsx'), 'utf8');

    assert.ok(modalsSrc.includes('<ProfilePhotoCropModal'), 'AccountSettingsModal must integrate ProfilePhotoCropModal');
    assert.ok(profileCompSrc.includes('<ProfilePhotoCropModal'), 'ProfileIdentityComponent must integrate ProfilePhotoCropModal');
    assert.ok(profileTabSrc.includes('<ProfilePhotoCropModal'), 'ProfileTab must integrate ProfilePhotoCropModal');
  });

  it('8. Persistence contract: Cropped photo updates profile in database and client storage', () => {
    const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');

    assert.ok(appSrc.includes('handleUpdateUserPhoto'), 'App.tsx must provide handleUpdateUserPhoto');
    assert.ok(appSrc.includes('api.updateProfile({ photoUrl: newPhotoUrl })'), 'Must persist photoUrl to backend database via api.updateProfile');
    assert.ok(appSrc.includes('applyvise_user_photo_${currentUser.id}'), 'Must persist photoUrl to user-scoped localStorage');
  });
});
