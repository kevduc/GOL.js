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
    game = new Game(canvas, GOL_Rule, "Image");

    // Play button
    let playButton = document.getElementById("play");
    const PlayButtonText = { false: "Play", true: "Pause" };
    // Init state
    playButton.dataset.state = game.isPlaying;
    playButton.innerText = PlayButtonText[playButton.dataset.state];

    playButton.addEventListener("click", function () {
        let state = this.dataset.state;

        // Update state
        state = state == "false";
        this.dataset.state = state;
        this.innerText = PlayButtonText[state];

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
    });

    // Step input
    let stepInput = document.getElementById('step');
    // Init state
    stepInput.value = game.stepSize;

    stepInput.addEventListener("change", function () {
        game.stepSize = Number(this.value);
    });

    // Drawing method select
    let drawMethodSelect = document.getElementById('draw-method');
    // Init state
    drawMethodSelect.querySelector("#" + game.drawMethod).click();

    drawMethodSelect.querySelectorAll("input[name='draw-method']").forEach(input => {
        console.log(input);
        input.addEventListener("change", function () {
            game.drawMethod = this.value;
            alert(this.value);
        })
    });

    // Draw button
    let drawButton = document.getElementById('draw');

    drawButton.addEventListener("click", function () {
        game.draw();
    });


    // Display switch
    displaySwitch = document.querySelector('#display-switch');
    // Init state
    displaySwitch.checked = game.display;

    displaySwitch.addEventListener("change", function () {
        game.display = this.checked;
    });

});

class Game {
    constructor(canvas, rule, drawMethod = "Image") {
        // displayMethod: "Image" (faster, no scaling), "Rect" (slower, scaling), "None" (fastest, no display)

        this.stepSize = 1;
        this.timer = null;
        this.fpstimer = null;
        this.fps = 0;
        this.isPlaying = false;
        this.display = true;

        this.rule = rule;
        this.ctx = canvas.getContext("2d");
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.drawMethod = drawMethod;

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
                .map(({ dr, dc }) => that.wrap({ r: pos.r + dr, c: pos.c + dc }));
        };

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
        //this.paste(this.RPentominoPattern/*, { r: Math.floor(this.h / 2), c: Math.floor(this.w / 2) }*/);

        this.randomFill();

        this.draw();
    }

    randomFill() {
        for (let i = 0; i < this.grid.length; i++)
            for (let j = 0; j < this.grid[i].length; j++)
                this.grid[i][j] = Math.round(Math.random());
    }

    paste(pattern, pos = { r: 0, c: 0 }) {
        pattern
            .drdc2grid(pos)
            .forEach(({ r, c }) => { this.grid[r][c] = 1; });
    }

    nextGeneration(niter = 1) {
        for (let i = 0; i < niter; i++) {
            this.grid = this.grid.map((row, r) =>
                row.map((val, c) => {
                    let sum =
                        this.gridValueAt(r - 1, c - 1) + this.gridValueAt(r - 1, c) + this.gridValueAt(r - 1, c + 1) +
                        this.gridValueAt(r, c - 1) + this.gridValueAt(r, c + 1) +
                        this.gridValueAt(r + 1, c - 1) + this.gridValueAt(r + 1, c) + this.gridValueAt(r + 1, c + 1);

                    return this.rule[val][sum];
                })
            );
        }
    }

    draw(drawMethod = this.drawMethod) {
        switch (drawMethod) {
            case "Image":
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
                break;
            case "Rect":
                this.ctx.fillStyle = "black";
                this.ctx.fillRect(0, 0, this.w, this.w);

                this.ctx.fillStyle = "white";
                this.grid.forEach((row, r) =>
                    row.forEach((val, c) => {
                        if (this.grid[r][c]) this.ctx.fillRect(c, r, 1, 1);
                    })
                );
                break;
            default:
                console.error("Invalid drawing method:", drawMethod);
                break;
        }
    }

    play() {
        this.isPlaying = true;
        let t = new Date(), prev_t;
        this.timer = window.setInterval(() => {
            prev_t = t;
            t = new Date();
            this.fps = .5 * (this.fps + 1000 / (t - prev_t));

            this.nextGeneration(this.stepSize);
            if (this.display) this.draw();
        }, 0);

        this.fpstimer = window.setInterval(() => {
            console.log("FPS:", Math.round(100 * this.fps) / 100);
        }, 100);
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

    wrap({ r, c }) {
        return { r: (r + this.h) % this.h, c: (c + this.w) % this.w };
    }

    gridValueAt(r, c) {
        let pos = this.wrap({ r: r, c: c });
        return this.grid[pos.r][pos.c];
    }

}

Math.rem = function (x, m) {
    return (x % m + m) % m;
}
