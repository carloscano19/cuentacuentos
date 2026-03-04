// js/player.js
export class StoryPlayer {
    constructor(audioUrl, onUpdate, onEnded) {
        this.audio = new Audio(audioUrl);
        this.onUpdate = onUpdate;
        this.onEnded = onEnded;

        this.audio.addEventListener('timeupdate', () => {
            if (this.onUpdate) {
                this.onUpdate({
                    currentTime: this.audio.currentTime,
                    duration: this.audio.duration,
                    percent: (this.audio.currentTime / this.audio.duration) * 100
                });
            }
        });

        this.audio.addEventListener('ended', () => {
            if (this.onEnded) this.onEnded();
        });
    }

    play() {
        this.audio.play();
    }

    pause() {
        this.audio.pause();
    }

    toggle() {
        if (this.audio.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    seek(percent) {
        this.audio.currentTime = (percent / 100) * this.audio.duration;
    }

    setVolume(volume) {
        this.audio.volume = volume;
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
    }
}
