/* Conway's Game of Life rules:
    Any live cell with fewer than two live neighbours dies, as if by underpopulation.
    Any live cell with two or three live neighbours lives on to the next generation.
    Any live cell with more than three live neighbours dies, as if by overpopulation.
    Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.
*/
const GOL_Rule = {
    0: [0, 0, 0, 1, 0, 0, 0, 0, 0],
    1: [0, 0, 1, 1, 0, 0, 0, 0, 0]
};

var game;

window.addEventListener('DOMContentLoaded', function () {

    let canvas = document.getElementById("canvas");
    game = new Game(canvas, GOL_Rule);

});

class Game {
    constructor(canvas, rule) {
        this.timer = undefined;

        this.rule = rule;
        this.ctx = canvas.getContext("2d");
        this.ctx.scale(5,5);

        this.w = canvas.width;
        this.h = canvas.height;

        this.im = this.ctx.createImageData(this.w, this.h);
        this.grid = new Array(this.w * this.h).fill(0);

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
                .map(({ dr, dc }) => ({ r: Math.rem(pos.r + dr, that.h), c: Math.rem(pos.c + dc, that.w) }))
                .map(({ r, c }) => that.sub2ind({ r, c }));
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
            //.drdc2grid({ r: Math.floor(this.h / 2), c: Math.floor(this.w / 2) })
            .drdc2grid({ r: 1, c: 1 })
            .forEach(idx => { this.grid[idx] = 1; });
    }

    nextGeneration() {
        this.grid = this.grid.map((val, idx) => {
            let currentPos = this.ind2sub(idx);
            let sum =
                this.AdjacentSquarePattern
                    .drdc2grid(currentPos)
                    .reduce((acc, idx) => acc + this.grid[idx] || 0, 0);

            return this.rule[val][sum];
        });
    }

    updateCanvas() {
        this.grid.forEach((val, idx) => {
            let bw = 255 * val;
            let i = 4 * idx;
            this.im.data[i + 0] = bw;
            this.im.data[i + 1] = bw;
            this.im.data[i + 2] = bw;
            this.im.data[i + 3] = 255;
        });

        this.ctx.putImageData(this.im, 0, 0);
    }

    run() {
        this.timer = window.setInterval(() => {
            this.nextGeneration();
            this.updateCanvas();
        }, 0);
    }

    pause() {
        window.clearInterval(this.timer);
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
