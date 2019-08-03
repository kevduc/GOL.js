/* Conway's Game of Life rules:
    Any live cell with fewer than two live neighbours dies, as if by underpopulation.
    Any live cell with two or three live neighbours lives on to the next generation.
    Any live cell with more than three live neighbours dies, as if by overpopulation.
    Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.
*/
const GOL_Rule = {
    // Number of adjacent cells:
    //      0  1  2  3  4  5  6  7  8
    0: [0, 0, 0, 1, 0, 0, 0, 0, 0], // Cell is currently dead
    1: [0, 0, 1, 1, 0, 0, 0, 0, 0]  // Cell is currently alive
};

var game;

window.addEventListener('DOMContentLoaded', () => {

    let canvas = document.getElementById("canvas");
    game = new Game(canvas, GOL_Rule);

    let button = document.getElementById("play");
    const ButtonText = {false: "Play", true: "Pause"};
    // Init state
    button.dataset.state = game.isPlaying;
    button.innerText = ButtonText[button.dataset.state];

    button.addEventListener("click", function() {
        let state = this.dataset.state;

        // Update state
        state = state == "false";
        this.dataset.state = state;
        this.innerText = ButtonText[state];

        // Action
        switch (state) {
            case false:
                game.pause();
                break;
            case true:
                game.play();
                break;
            default:
                break;
        }
    })

});

class Game {
    constructor(canvas, rule) {
        this.timer = null;
        this.fpstimer = null;
        this.fps = 0;
        this.isPlaying = false;

        this.rule = rule;
        this.ctx = canvas.getContext("2d");
        this.ctx.scale(5, 5);

        this.w = canvas.width;
        this.h = canvas.height;

        this.im = this.ctx.createImageData(this.w, this.h);
        this.grid = new Array(this.h);
        for (let i = 0; i < this.grid.length; i++)
            this.grid[i] = new Array(this.w).fill(0);

        // Patterns
        let that = this;

        Array.prototype.bit2drdc = function (width, origin = { r: 0, c: 0 }) {
            return this
                .reduce((acc, bit, idx) => { if (bit) acc.push(idx); return acc }, [])
                .map(idx => that.ind2sub(idx, width))
                .map(({ r, c }) => ({ dr: r - origin.r, dc: c - origin.c }));
        };

        Array.prototype.drdc2grid = function (pos) {
            return this
                .map(({ dr, dc }) => ({ r: Math.rem(pos.r + dr, that.h), c: Math.rem(pos.c + dc, that.w) }));
        };

        this.AdjacentSquarePattern = [
            1, 1, 1,
            1, 0, 1,
            1, 1, 1
        ].bit2drdc(3, { r: 1, c: 1 });

        this.RPentominoPattern = [
            0, 1, 1,
            1, 1, 0,
            0, 1, 0
        ].bit2drdc(3, { r: 1, c: 1 });

        this.GliderPattern = [
            0, 0, 1,
            1, 0, 1,
            0, 1, 1
        ].bit2drdc(3, { r: 1, c: 1 });

        // Paste
        this.RPentominoPattern
            .drdc2grid({ r: Math.floor(this.h / 2), c: Math.floor(this.w / 2) })
            //.drdc2grid({ r: 1, c: 1 })
            .forEach(({ r, c }) => { this.grid[r][c] = 1; });
        
        this.updateCanvas();
    }

    nextGeneration() {
        this.grid = this.grid.map((row, r) =>
            row.map((val, c) => {
                let sum =
                    this.AdjacentSquarePattern
                        .drdc2grid({ r, c })
                        .reduce((acc, { r, c }) => acc + this.grid[r][c] || 0, 0);

                return this.rule[val][sum];
            })
        );
    }

    updateCanvas() {
        this.grid.forEach((row, r) =>
            row.forEach((val, c) => {
                let bw = 255 * val;
                let i = 4 * this.sub2ind({ r, c });
                this.im.data[i + 0] = bw;
                this.im.data[i + 1] = bw;
                this.im.data[i + 2] = bw;
                this.im.data[i + 3] = 255;
            })
        );

        this.ctx.putImageData(this.im, 0, 0);
    }

    play() {
        this.isPlaying = true;
        let t = new Date(), prev_t;
        this.timer = window.setInterval(() => {
            prev_t = t;
            t = new Date();
            this.fps = .5*(this.fps + 1000/(t-prev_t));

            this.nextGeneration();
            this.updateCanvas();
        }, 0);

        this.fpstimer = window.setInterval(() => {
            console.log("FPS: ", Math.round(100*this.fps)/100);
        }, 500);
    }

    pause() {
        window.clearInterval(this.timer);
        window.clearInterval(this.fpstimer);
        this.isPlaying = false;
    }


    // Helper functions

    sub2ind({ r, c }) {
        return r * this.w + c;
    }

    ind2sub(idx, w = this.w) {
        return { r: Math.floor(idx / w), c: Math.rem(idx, w) }; // use of rem instead of mod for negative idx
    }

}

Math.rem = function (x, m) {
    return (x % m + m) % m;
}
