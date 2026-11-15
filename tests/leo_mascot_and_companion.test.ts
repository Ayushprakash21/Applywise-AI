import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('APPLYWISE AI — Leo Mascot & Career Companion Transformation Suite', () => {

  it('1. Identity & Naming: AICopilot.tsx presents Leo as the career companion', () => {
    const copilotSrc = fs.readFileSync(path.resolve('src/components/AICopilot.tsx'), 'utf-8');

    // Name and branding
    assert.ok(copilotSrc.includes('Leo'), 'Must include Leo name');
    assert.ok(copilotSrc.includes('Your ApplyWise Career Companion'), 'Must include exact subtitle');
    assert.ok(copilotSrc.includes('Talk to Leo'), 'Must provide "Talk to Leo" tooltip');
    assert.ok(copilotSrc.includes('Career Assistant'), 'Must include Career Assistant role');

    // Welcome message
    assert.ok(
      copilotSrc.includes("Hey! I'm Leo. 🐾"),
      'Must contain the exact Leo welcome greeting with paw'
    );
    assert.ok(
      copilotSrc.includes('I can help you discover opportunities, improve your resume, prepare for interviews and navigate your career journey.'),
      'Must contain the exact capabilities in welcome message'
    );
    assert.ok(
      copilotSrc.includes('What shall we work on today?'),
      'Must contain the exact closing prompt in welcome message'
    );

    // Thinking state
    assert.ok(
      copilotSrc.includes('Leo is thinking...'),
      'Must display "Leo is thinking..." during loading state'
    );

    // Input placeholder
    assert.ok(
      copilotSrc.includes('Ask Leo about'),
      'Input placeholder must reference Leo'
    );
  });

  it('2. Grey Persian Cat Mascot: LeoCharacter.tsx implements complete anatomy and design specs', () => {
    const charSrc = fs.readFileSync(path.resolve('src/components/leo/LeoCharacter.tsx'), 'utf-8');

    // Physical anatomy of Persian cat
    assert.ok(charSrc.includes('fur_head_'), 'Must define layered silver-grey head gradient');
    assert.ok(charSrc.includes('fur_cheek_'), 'Must define fluffy Persian cheek layers');
    assert.ok(charSrc.includes('ear_inner_'), 'Must define small rounded ears with soft pink inner ear');
    assert.ok(charSrc.includes('eye_amber_'), 'Must define luminous golden-amber eyes');
    assert.ok(charSrc.includes('nose_pink_'), 'Must define short Persian button nose');
    assert.ok(charSrc.includes('collar_navy_'), 'Must define ApplyWise midnight-navy collar');
    assert.ok(charSrc.includes('collar_blue_edge_'), 'Must define electric-blue illuminated collar trim');
    assert.ok(charSrc.includes('gold_medallion_'), 'Must define golden AV medallion charm');
    assert.ok(charSrc.includes('leo-tail-sway'), 'Must support luxurious fluffy tail sway');
    assert.ok(charSrc.includes('leo-paw-raised'), 'Must support welcoming paw gesture');
  });

  it('3. Contextual Animation States: LeoCharacter handles all 6 emotional states', () => {
    const charSrc = fs.readFileSync(path.resolve('src/components/leo/LeoCharacter.tsx'), 'utf-8');

    const expectedStates = ['idle', 'greeting', 'thinking', 'responding', 'success', 'error'];
    for (const state of expectedStates) {
      assert.ok(charSrc.includes(`'${state}'`), `Must support state '${state}'`);
    }

    // Natural blinking loop & reduced motion
    assert.ok(charSrc.includes('isBlinking'), 'Must manage organic blinking cycle');
    assert.ok(charSrc.includes('prefers-reduced-motion'), 'Must check prefers-reduced-motion');
    assert.ok(charSrc.includes('reducedMotion'), 'Must respect accessibility reduced motion preference');
  });

  it('4. Floating Launcher Contract: preserves required positioning, accessibility & touch targets', () => {
    const copilotSrc = fs.readFileSync(path.resolve('src/components/AICopilot.tsx'), 'utf-8');

    assert.ok(
      copilotSrc.includes('bottom-20 right-4 sm:bottom-6 sm:right-6'),
      'Launcher must sit cleanly above mobile bar'
    );
    assert.ok(copilotSrc.includes('touch-target'), 'Launcher must maintain touch-target class');
    assert.ok(
      copilotSrc.includes('aria-label="Open ApplyVise Copilot"'),
      'Must maintain aria-label for backward compatibility and test contracts'
    );
    assert.ok(
      copilotSrc.includes('inset-x-3 bottom-20 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px]'),
      'Chat drawer must adapt to viewport'
    );
  });

  it('5. API & Functional Preservation: Underlying intelligence and auth integration remain intact', () => {
    const copilotSrc = fs.readFileSync(path.resolve('src/components/AICopilot.tsx'), 'utf-8');

    assert.ok(copilotSrc.includes('api.askCopilot'), 'Must preserve askCopilot endpoint integration');
    assert.ok(copilotSrc.includes('api.getSubscription'), 'Must preserve subscription usage tracking');
    assert.ok(copilotSrc.includes('isPermanentFreeAccessAccount'), 'Must preserve unlimited free access logic');
    assert.ok(copilotSrc.includes('export const Leo = AICopilot;'), 'Must export Leo alias for seamless imports');
  });
});
