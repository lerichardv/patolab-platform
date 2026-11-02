/**
 * Realtime notification sound utility.
 * Inlines normalized /sounds/ding.mp3 as a base64 Data URI to guarantee
 * instant, zero-latency playback without network dependencies or 404/CORS errors.
 * Uses Web Audio API with HTML5 Audio and synthetic oscillator fallbacks.
 */

const DING_AUDIO_DATA_URI =
    'data:audio/mp3;base64,' +
    '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';

let globalAudioCtx: AudioContext | null = null;
let globalAudioBuffer: AudioBuffer | null = null;
let globalFallbackAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!globalAudioCtx) {
        const AudioCtxClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;

        if (AudioCtxClass) {
            globalAudioCtx = new AudioCtxClass();
        }
    }

    return globalAudioCtx;
}

// Convert base64 Data URI to ArrayBuffer for Web Audio decoding
function dataUriToArrayBuffer(dataUri: string): ArrayBuffer {
    if (typeof window === 'undefined') {
        return new ArrayBuffer(0);
    }

    const base64Index = dataUri.indexOf(';base64,') + 8;
    const base64 = dataUri.substring(base64Index);
    const raw =
        typeof atob === 'function'
            ? atob(base64)
            : Buffer.from(base64, 'base64').toString('binary');
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));

    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }

    return array.buffer;
}

// Pre-decode audio buffer into memory
async function ensureAudioBuffer(): Promise<AudioBuffer | null> {
    if (typeof window === 'undefined') {
        return null;
    }

    if (globalAudioBuffer) {
        return globalAudioBuffer;
    }

    const ctx = getAudioContext();

    if (!ctx) {
        return null;
    }

    try {
        const arrayBuffer = dataUriToArrayBuffer(DING_AUDIO_DATA_URI);

        globalAudioBuffer = await ctx.decodeAudioData(arrayBuffer);

        return globalAudioBuffer;
    } catch (e) {
        console.warn(
            '[Sound] Failed to decode MP3 buffer, will use fallbacks:',
            e,
        );

        return null;
    }
}

function getFallbackAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!globalFallbackAudio) {
        globalFallbackAudio = new Audio(DING_AUDIO_DATA_URI);
        globalFallbackAudio.preload = 'auto';
    }

    return globalFallbackAudio;
}

/**
 * Synthetic pleasant chime via Web Audio Oscillator as a bulletproof fallback.
 */
function playSyntheticChime(ctx: AudioContext, volume = 1.0): void {
    try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // 880Hz (A5) -> 1320Hz (E6) harmonic ding
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(
            Math.min(1.0, volume * 0.8),
            now + 0.02,
        );
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.65);
    } catch {
        // ignore synthetic fallback failure
    }
}

export function isAudioUnlocked(): boolean {
    return audioUnlocked;
}

/**
 * Unlocks the audio engine on user interaction (satisfies Chrome & Safari autoplay policy).
 */
export function unlockAudio(): void {
    audioUnlocked = true;

    const ctx = getAudioContext();

    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }

    const audio = getFallbackAudio();

    if (audio) {
        audio.load();
    }

    ensureAudioBuffer();
}

// Auto-attach gesture unlock listeners
if (typeof window !== 'undefined') {
    const handleGesture = () => {
        unlockAudio();
        window.removeEventListener('click', handleGesture, true);
        window.removeEventListener('keydown', handleGesture, true);
        window.removeEventListener('pointerdown', handleGesture, true);
        window.removeEventListener('touchstart', handleGesture, true);
    };

    window.addEventListener('click', handleGesture, true);
    window.addEventListener('keydown', handleGesture, true);
    window.addEventListener('pointerdown', handleGesture, true);
    window.addEventListener('touchstart', handleGesture, true);

    // Initial pre-load of buffer
    ensureAudioBuffer();
}

/**
 * Plays the notification chime.
 * 1. Tries Web Audio API with pre-decoded MP3 buffer.
 * 2. Tries HTML5 Audio element with base64 Data URI.
 * 3. Tries Web Audio synthetic oscillator chime.
 */
export async function playNotificationDing(volume = 1.0): Promise<void> {
    if (typeof window === 'undefined') {
        return;
    }

    console.log('[Sound] Playing notification ding...');

    const ctx = getAudioContext();

    if (ctx) {
        // If context was suspended, attempt to resume it
        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
            } catch {
                // Resume might fail if user has not interacted with document yet
            }
        }

        if (ctx.state !== 'suspended') {
            const buffer = await ensureAudioBuffer();

            if (buffer) {
                try {
                    const source = ctx.createBufferSource();
                    const gainNode = ctx.createGain();

                    source.buffer = buffer;
                    gainNode.gain.value = Math.max(0, volume);

                    source.connect(gainNode);
                    gainNode.connect(ctx.destination);
                    source.start(0);

                    console.log('[Sound] Web Audio buffer played successfully');

                    return;
                } catch (err) {
                    console.warn(
                        '[Sound] Web Audio buffer playback failed:',
                        err,
                    );
                }
            } else {
                // Buffer not decoded yet; play synthetic chime via running context
                playSyntheticChime(ctx, volume);
                console.log('[Sound] Synthetic chime played successfully');

                return;
            }
        }
    }

    // Fallback: HTML5 Audio
    try {
        const audio = getFallbackAudio();

        if (audio) {
            audio.volume = Math.min(1.0, Math.max(0, volume));
            audio.currentTime = 0;

            await audio.play();

            console.log('[Sound] HTML5 Audio played successfully');

            return;
        }
    } catch (htmlErr) {
        console.warn(
            '[Sound] Audio playback blocked by browser autoplay policy. User gesture required on the page:',
            htmlErr,
        );

        // Last-resort fallback: if context exists, try synthetic chime
        if (ctx) {
            playSyntheticChime(ctx, volume);
        }
    }
}
