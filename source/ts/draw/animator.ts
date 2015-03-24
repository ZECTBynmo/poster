// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('../utils/utils');

/**
 * Animation helper.
 */
export class Animator extends utils.PosterClass {
    public duration;
    private _start;

    constructor(duration) {
        super();
        this.duration = duration;
        this._start = Date.now();
    }

    /**
     * Get the time in the animation
     * @return {float} between 0 and 1
     */
    time() {
        var elapsed = Date.now() - this._start;
        return (elapsed % this.duration) / this.duration;
    }

    /**
     * Reset the animation progress to 0.
     */
    reset() {
        this._start = Date.now();
    }
}
