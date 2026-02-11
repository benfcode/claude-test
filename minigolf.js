(function () {
    const canvas = document.getElementById('golf-canvas');
    const ctx = canvas.getContext('2d');

    // Game constants
    const CANVAS_WIDTH = 600;
    const CANVAS_HEIGHT = 500;
    const BALL_RADIUS = 8;
    const HOLE_RADIUS = 14;
    const FRICTION = 0.985;
    const MIN_SPEED = 0.15;
    const MAX_POWER = 15;
    const PAR = 3;
    const TOTAL_HOLES = 3;

    const COLORS = {
        grass: '#4a8c3f',
        grassDark: '#3d7534',
        border: '#2d5a1e',
        ball: '#ffffff',
        ballOutline: '#cccccc',
        hole: '#1a1a1a',
        holeRim: '#333333',
        wall: '#8B4513',
        wallStroke: '#654321',
        bumper: '#e74c3c',
        bumperStroke: '#c0392b',
        sandTrap: '#f4d03f',
        sandTrapStroke: '#d4ac0d',
        aimLine: 'rgba(255, 255, 255, 0.7)',
        ui: '#1e3a5f',
    };

    // Game state
    let gameState = 'title'; // title, aiming, rolling, sinking, holeDone, gameOver
    let currentHole = 0;
    let scores = [];
    let strokes = 0;

    // Ball
    let ball = { x: 0, y: 0, vx: 0, vy: 0 };

    // Hole target
    let holePos = { x: 0, y: 0 };

    // Start position
    let startPos = { x: 0, y: 0 };

    // Obstacles
    let obstacles = [];

    // Aiming
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let dragEnd = { x: 0, y: 0 };

    // Sinking animation
    let holeAnimTimer = 0;
    let ballInHoleAnim = false;
    let ballScale = 1;

    // Initialize canvas
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    function resizeCanvas() {
        const container = canvas.parentElement;
        const maxWidth = container.clientWidth - 20;
        const scale = Math.min(1, maxWidth / CANVAS_WIDTH);
        canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
        canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ---------- Utility ----------

    function randRange(min, max) {
        return min + Math.random() * (max - min);
    }

    function getCanvasPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }

    // ---------- Hole Generation ----------

    function overlapsPoint(obstacle, point, margin) {
        if (obstacle.type === 'rect') {
            var cx = obstacle.x + obstacle.width / 2;
            var cy = obstacle.y + obstacle.height / 2;
            return Math.abs(cx - point.x) < obstacle.width / 2 + margin &&
                   Math.abs(cy - point.y) < obstacle.height / 2 + margin;
        }
        var dx = obstacle.x - point.x;
        var dy = obstacle.y - point.y;
        var r = (obstacle.radius || 0) + margin;
        return dx * dx + dy * dy < r * r;
    }

    function generateRectObstacle() {
        var width = 20 + Math.random() * 100;
        var height = 15 + Math.random() * 20;
        var x = 60 + Math.random() * (CANVAS_WIDTH - 120 - width);
        var y = 80 + Math.random() * (CANVAS_HEIGHT - 160 - height);
        var angle = Math.random() < 0.4 ? (Math.random() - 0.5) * Math.PI / 3 : 0;
        return { type: 'rect', x: x, y: y, width: width, height: height, angle: angle };
    }

    function generateBumperObstacle() {
        var radius = 15 + Math.random() * 20;
        var x = 80 + Math.random() * (CANVAS_WIDTH - 160);
        var y = 100 + Math.random() * (CANVAS_HEIGHT - 200);
        return { type: 'bumper', x: x, y: y, radius: radius };
    }

    function generateSandTrap() {
        var radius = 25 + Math.random() * 30;
        var x = 80 + Math.random() * (CANVAS_WIDTH - 160);
        var y = 100 + Math.random() * (CANVAS_HEIGHT - 200);
        return { type: 'sand', x: x, y: y, radius: radius };
    }

    function generateHole(holeNum) {
        obstacles = [];

        // Vary start/hole layout per hole
        if (holeNum === 0) {
            startPos = { x: CANVAS_WIDTH / 2 + randRange(-80, 80), y: CANVAS_HEIGHT - 70 };
            holePos = { x: CANVAS_WIDTH / 2 + randRange(-80, 80), y: 70 };
        } else if (holeNum === 1) {
            startPos = { x: 70, y: CANVAS_HEIGHT / 2 + randRange(-80, 80) };
            holePos = { x: CANVAS_WIDTH - 70, y: CANVAS_HEIGHT / 2 + randRange(-80, 80) };
        } else {
            startPos = { x: 80 + randRange(0, 60), y: CANVAS_HEIGHT - 80 + randRange(-30, 30) };
            holePos = { x: CANVAS_WIDTH - 80 + randRange(-60, 0), y: 80 + randRange(-30, 30) };
        }

        ball.x = startPos.x;
        ball.y = startPos.y;
        ball.vx = 0;
        ball.vy = 0;

        var numObstacles = 3 + Math.floor(Math.random() * 3); // 3-5

        for (var i = 0; i < numObstacles; i++) {
            var type = Math.random();
            var obstacle;

            if (type < 0.5) {
                obstacle = generateRectObstacle();
            } else if (type < 0.8) {
                obstacle = generateBumperObstacle();
            } else {
                obstacle = generateSandTrap();
            }

            if (obstacle && !overlapsPoint(obstacle, startPos, 45) && !overlapsPoint(obstacle, holePos, 35)) {
                obstacles.push(obstacle);
            }
        }

        strokes = 0;
    }

    // ---------- Physics ----------

    function collideRect(rect) {
        var bx = ball.x, by = ball.y, bvx = ball.vx, bvy = ball.vy;

        if (rect.angle !== 0) {
            var cos = Math.cos(-rect.angle);
            var sin = Math.sin(-rect.angle);
            var rcx = rect.x + rect.width / 2;
            var rcy = rect.y + rect.height / 2;
            var ddx = ball.x - rcx;
            var ddy = ball.y - rcy;
            bx = rcx + ddx * cos - ddy * sin;
            by = rcy + ddx * sin + ddy * cos;
            bvx = ball.vx * cos - ball.vy * sin;
            bvy = ball.vx * sin + ball.vy * cos;
        }

        var closestX = Math.max(rect.x, Math.min(bx, rect.x + rect.width));
        var closestY = Math.max(rect.y, Math.min(by, rect.y + rect.height));
        var dx = bx - closestX;
        var dy = by - closestY;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < BALL_RADIUS && dist > 0) {
            var nx = dx / dist;
            var ny = dy / dist;
            var dot = bvx * nx + bvy * ny;
            bvx = (bvx - 2 * dot * nx) * 0.8;
            bvy = (bvy - 2 * dot * ny) * 0.8;
            bx = closestX + nx * (BALL_RADIUS + 1);
            by = closestY + ny * (BALL_RADIUS + 1);

            if (rect.angle !== 0) {
                var cos2 = Math.cos(rect.angle);
                var sin2 = Math.sin(rect.angle);
                var rcx2 = rect.x + rect.width / 2;
                var rcy2 = rect.y + rect.height / 2;
                var ddx2 = bx - rcx2;
                var ddy2 = by - rcy2;
                ball.x = rcx2 + ddx2 * cos2 - ddy2 * sin2;
                ball.y = rcy2 + ddx2 * sin2 + ddy2 * cos2;
                ball.vx = bvx * cos2 - bvy * sin2;
                ball.vy = bvx * sin2 + bvy * cos2;
            } else {
                ball.x = bx;
                ball.y = by;
                ball.vx = bvx;
                ball.vy = bvy;
            }
        }
    }

    function collideBumper(bumper) {
        var dx = ball.x - bumper.x;
        var dy = ball.y - bumper.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var minDist = BALL_RADIUS + bumper.radius;

        if (dist < minDist && dist > 0) {
            var nx = dx / dist;
            var ny = dy / dist;
            var dot = ball.vx * nx + ball.vy * ny;
            ball.vx = (ball.vx - 2 * dot * nx) * 1.1;
            ball.vy = (ball.vy - 2 * dot * ny) * 1.1;
            ball.x = bumper.x + nx * (minDist + 1);
            ball.y = bumper.y + ny * (minDist + 1);

            var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (speed > MAX_POWER) {
                ball.vx = (ball.vx / speed) * MAX_POWER;
                ball.vy = (ball.vy / speed) * MAX_POWER;
            }
        }
    }

    function updateBall() {
        if (gameState !== 'rolling') return;

        // Sand friction
        var frictionMod = FRICTION;
        for (var i = 0; i < obstacles.length; i++) {
            var obs = obstacles[i];
            if (obs.type === 'sand') {
                var sdx = ball.x - obs.x;
                var sdy = ball.y - obs.y;
                if (sdx * sdx + sdy * sdy < obs.radius * obs.radius) {
                    frictionMod = 0.96;
                }
            }
        }

        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= frictionMod;
        ball.vy *= frictionMod;

        // Wall bounces
        if (ball.x - BALL_RADIUS < 10) {
            ball.x = 10 + BALL_RADIUS;
            ball.vx = Math.abs(ball.vx) * 0.8;
        }
        if (ball.x + BALL_RADIUS > CANVAS_WIDTH - 10) {
            ball.x = CANVAS_WIDTH - 10 - BALL_RADIUS;
            ball.vx = -Math.abs(ball.vx) * 0.8;
        }
        if (ball.y - BALL_RADIUS < 10) {
            ball.y = 10 + BALL_RADIUS;
            ball.vy = Math.abs(ball.vy) * 0.8;
        }
        if (ball.y + BALL_RADIUS > CANVAS_HEIGHT - 10) {
            ball.y = CANVAS_HEIGHT - 10 - BALL_RADIUS;
            ball.vy = -Math.abs(ball.vy) * 0.8;
        }

        // Obstacle collisions
        for (var j = 0; j < obstacles.length; j++) {
            var o = obstacles[j];
            if (o.type === 'rect') collideRect(o);
            else if (o.type === 'bumper') collideBumper(o);
        }

        // Check if ball reached hole
        var hdx = ball.x - holePos.x;
        var hdy = ball.y - holePos.y;
        var hdist = Math.sqrt(hdx * hdx + hdy * hdy);
        var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

        if (hdist < HOLE_RADIUS - 2 && speed < 6) {
            ballInHoleAnim = true;
            holeAnimTimer = 0;
            ball.vx = 0;
            ball.vy = 0;
            gameState = 'sinking';
            return;
        }

        if (speed < MIN_SPEED) {
            ball.vx = 0;
            ball.vy = 0;
            gameState = 'aiming';
        }
    }

    // ---------- Drawing ----------

    function drawGrassTexture() {
        ctx.strokeStyle = COLORS.grassDark;
        ctx.lineWidth = 1;
        for (var i = 0; i < 40; i++) {
            var x = Math.random() * CANVAS_WIDTH;
            var y = Math.random() * CANVAS_HEIGHT;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + randRange(-4, 4), y - randRange(5, 12));
            ctx.stroke();
        }
    }

    function drawCourse() {
        ctx.fillStyle = COLORS.grass;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Grass stripes
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for (var x = 0; x < CANVAS_WIDTH; x += 40) {
            if ((x / 40) % 2 === 0) ctx.fillRect(x, 0, 40, CANVAS_HEIGHT);
        }

        // Border
        ctx.fillStyle = COLORS.border;
        ctx.fillRect(0, 0, CANVAS_WIDTH, 10);
        ctx.fillRect(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 10);
        ctx.fillRect(0, 0, 10, CANVAS_HEIGHT);
        ctx.fillRect(CANVAS_WIDTH - 10, 0, 10, CANVAS_HEIGHT);

        ctx.strokeStyle = '#4a7a2e';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);
    }

    function drawObstacles() {
        for (var i = 0; i < obstacles.length; i++) {
            var obs = obstacles[i];

            if (obs.type === 'rect') {
                ctx.save();
                if (obs.angle) {
                    ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
                    ctx.rotate(obs.angle);
                    ctx.translate(-(obs.x + obs.width / 2), -(obs.y + obs.height / 2));
                }

                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.roundRect(obs.x + 3, obs.y + 3, obs.width, obs.height, 4);
                ctx.fill();

                // Wall
                ctx.fillStyle = COLORS.wall;
                ctx.beginPath();
                ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
                ctx.fill();
                ctx.strokeStyle = COLORS.wallStroke;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Wood grain
                ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                ctx.lineWidth = 1;
                for (var g = 1; g < 3; g++) {
                    var lineY = obs.y + (obs.height / 3) * g;
                    ctx.beginPath();
                    ctx.moveTo(obs.x + 4, lineY);
                    ctx.lineTo(obs.x + obs.width - 4, lineY);
                    ctx.stroke();
                }

                ctx.restore();

            } else if (obs.type === 'bumper') {
                // Shadow
                ctx.beginPath();
                ctx.arc(obs.x + 3, obs.y + 3, obs.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fill();

                // Body
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
                ctx.fillStyle = COLORS.bumper;
                ctx.fill();
                ctx.strokeStyle = COLORS.bumperStroke;
                ctx.lineWidth = 3;
                ctx.stroke();

                // Highlight
                ctx.beginPath();
                ctx.arc(obs.x - obs.radius * 0.25, obs.y - obs.radius * 0.25,
                    obs.radius * 0.35, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fill();

                // Star
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.font = obs.radius + 'px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('\u2731', obs.x, obs.y);

            } else if (obs.type === 'sand') {
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
                ctx.fillStyle = COLORS.sandTrap;
                ctx.fill();
                ctx.strokeStyle = COLORS.sandTrapStroke;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Dots
                ctx.fillStyle = 'rgba(139,119,42,0.4)';
                for (var d = 0; d < 8; d++) {
                    var a = (Math.PI * 2 / 8) * d;
                    var r = obs.radius * 0.5;
                    ctx.beginPath();
                    ctx.arc(obs.x + Math.cos(a) * r, obs.y + Math.sin(a) * r, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    function drawHoleTarget() {
        // Shadow
        ctx.beginPath();
        ctx.arc(holePos.x + 2, holePos.y + 2, HOLE_RADIUS + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fill();

        // Rim
        ctx.beginPath();
        ctx.arc(holePos.x, holePos.y, HOLE_RADIUS + 4, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.holeRim;
        ctx.fill();

        // Hole
        ctx.beginPath();
        ctx.arc(holePos.x, holePos.y, HOLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.hole;
        ctx.fill();

        // Flag pole
        ctx.beginPath();
        ctx.moveTo(holePos.x, holePos.y);
        ctx.lineTo(holePos.x, holePos.y - 40);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Flag
        ctx.beginPath();
        ctx.moveTo(holePos.x, holePos.y - 40);
        ctx.lineTo(holePos.x + 22, holePos.y - 32);
        ctx.lineTo(holePos.x, holePos.y - 24);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();

        // Hole number
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentHole + 1, holePos.x + 8, holePos.y - 32);
    }

    function drawBall() {
        ctx.save();

        if (ballInHoleAnim) {
            ctx.globalAlpha = ballScale;
            ctx.translate(ball.x, ball.y);
            ctx.scale(ballScale, ballScale);
            ctx.translate(-ball.x, -ball.y);
        }

        // Shadow
        ctx.beginPath();
        ctx.arc(ball.x + 2, ball.y + 2, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fill();

        // Ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.ball;
        ctx.fill();
        ctx.strokeStyle = COLORS.ballOutline;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Highlight
        ctx.beginPath();
        ctx.arc(ball.x - 2, ball.y - 2, BALL_RADIUS * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();

        ctx.restore();
    }

    function drawAimLine() {
        var dx = dragEnd.x - dragStart.x;
        var dy = dragEnd.y - dragStart.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var power = Math.min(dist / 10, MAX_POWER);
        var angle = Math.atan2(dy, dx);

        // Direction line (opposite of drag)
        var lineLen = power * 8;
        var endX = ball.x - Math.cos(angle) * lineLen;
        var endY = ball.y - Math.sin(angle) * lineLen;

        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = COLORS.aimLine;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead
        var arrowSize = 8;
        var arrowAngle = Math.atan2(endY - ball.y, endX - ball.x);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowSize * Math.cos(arrowAngle - 0.4),
                   endY - arrowSize * Math.sin(arrowAngle - 0.4));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowSize * Math.cos(arrowAngle + 0.4),
                   endY - arrowSize * Math.sin(arrowAngle + 0.4));
        ctx.strokeStyle = COLORS.aimLine;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Power bar
        var barWidth = 100;
        var barHeight = 10;
        var barX = CANVAS_WIDTH / 2 - barWidth / 2;
        var barY = CANVAS_HEIGHT - 35;
        var powerPct = power / MAX_POWER;

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 6);
        ctx.fill();

        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 4);
        ctx.fill();

        var barColor;
        if (powerPct < 0.33) barColor = '#2ecc71';
        else if (powerPct < 0.66) barColor = '#f39c12';
        else barColor = '#e74c3c';

        if (powerPct > 0) {
            ctx.fillStyle = barColor;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth * powerPct, barHeight, 4);
            ctx.fill();
        }

        ctx.fillStyle = '#fff';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('POWER', CANVAS_WIDTH / 2, barY + barHeight / 2);
    }

    function drawHUD() {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(10, 12, 220, 36, 8);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '16px "DM Serif Text", serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Hole ' + (currentHole + 1) + '/' + TOTAL_HOLES +
            '  |  Stroke: ' + strokes + '  |  Par: ' + PAR, 22, 30);

        // Instruction hint when aiming
        if (gameState === 'aiming' && !isDragging && strokes === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.roundRect(CANVAS_WIDTH / 2 - 120, CANVAS_HEIGHT - 40, 240, 28, 8);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Click & drag on ball to aim and shoot', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 26);
        }
    }

    // ---------- Screens ----------

    function drawTitle() {
        ctx.fillStyle = COLORS.grass;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 10);

        drawGrassTexture();

        // Title shadow
        ctx.font = 'bold 48px "DM Serif Text", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillText('Mini Golf!', CANVAS_WIDTH / 2 + 2, CANVAS_HEIGHT / 2 - 62);
        ctx.fillStyle = '#fff';
        ctx.fillText('Mini Golf!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 64);

        // Subtitle
        ctx.font = '20px "DM Serif Text", serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText('3 Holes  |  Par 3 Each  |  Random Courses', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

        // Decorative ball
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2 - 50, CANVAS_HEIGHT / 2 + 40, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arrow
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH / 2 - 30, CANVAS_HEIGHT / 2 + 40);
        ctx.lineTo(CANVAS_WIDTH / 2 + 20, CANVAS_HEIGHT / 2 + 40);
        ctx.lineTo(CANVAS_WIDTH / 2 + 14, CANVAS_HEIGHT / 2 + 34);
        ctx.moveTo(CANVAS_WIDTH / 2 + 20, CANVAS_HEIGHT / 2 + 40);
        ctx.lineTo(CANVAS_WIDTH / 2 + 14, CANVAS_HEIGHT / 2 + 46);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Hole
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2 + 50, CANVAS_HEIGHT / 2 + 40, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2 + 50, CANVAS_HEIGHT / 2 + 40, 18, 0, Math.PI * 2);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Flag
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH / 2 + 50, CANVAS_HEIGHT / 2 + 40);
        ctx.lineTo(CANVAS_WIDTH / 2 + 50, CANVAS_HEIGHT / 2 + 12);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH / 2 + 50, CANVAS_HEIGHT / 2 + 12);
        ctx.lineTo(CANVAS_WIDTH / 2 + 70, CANVAS_HEIGHT / 2 + 19);
        ctx.lineTo(CANVAS_WIDTH / 2 + 50, CANVAS_HEIGHT / 2 + 26);
        ctx.fillStyle = '#e74c3c';
        ctx.fill();

        // Play button
        var btnX = CANVAS_WIDTH / 2 - 80;
        var btnY = CANVAS_HEIGHT / 2 + 80;
        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, 160, 50, 12);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px "DM Serif Text", serif';
        ctx.textAlign = 'center';
        ctx.fillText('Play!', CANVAS_WIDTH / 2, btnY + 28);
    }

    function drawHoleComplete() {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        var diff = strokes - PAR;
        var msg = 'Hole Complete!';
        var scoreMsg = '';

        if (strokes === 1) {
            msg = 'HOLE IN ONE!!!';
            scoreMsg = '(-2)';
        } else if (diff <= -2) {
            scoreMsg = 'Eagle! (' + diff + ')';
        } else if (diff === -1) {
            scoreMsg = 'Birdie! (-1)';
        } else if (diff === 0) {
            scoreMsg = 'Par (E)';
        } else if (diff === 1) {
            scoreMsg = 'Bogey (+1)';
        } else if (diff === 2) {
            scoreMsg = 'Double Bogey (+2)';
        } else {
            scoreMsg = '+' + diff;
        }

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px "DM Serif Text", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(msg, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

        ctx.font = '24px "DM Serif Text", serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText('Strokes: ' + strokes + '  |  ' + scoreMsg, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

        // Next button
        var label = currentHole < TOTAL_HOLES - 1 ? 'Next Hole' : 'See Results';
        var btnW = 160;
        var btnH = 45;
        var btnX = CANVAS_WIDTH / 2 - btnW / 2;
        var btnY = CANVAS_HEIGHT / 2 + 50;

        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 10);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px "DM Serif Text", serif';
        ctx.fillText(label, CANVAS_WIDTH / 2, btnY + btnH / 2 + 1);
    }

    function drawGameOver() {
        ctx.fillStyle = COLORS.grass;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 10);

        drawGrassTexture();

        // Scorecard
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.roundRect(CANVAS_WIDTH / 2 - 180, 40, 360, 340, 16);
        ctx.fill();
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#1e3a5f';
        ctx.font = 'bold 32px "DM Serif Text", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Scorecard', CANVAS_WIDTH / 2, 80);

        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH / 2 - 100, 100);
        ctx.lineTo(CANVAS_WIDTH / 2 + 100, 100);
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 2;
        ctx.stroke();

        var totalPar = PAR * TOTAL_HOLES;
        var totalScore = 0;
        ctx.font = '20px "DM Serif Text", serif';

        for (var i = 0; i < scores.length; i++) {
            var y = 135 + i * 45;
            totalScore += scores[i];
            var diff = scores[i] - PAR;
            var diffStr = diff === 0 ? 'E' : (diff > 0 ? '+' + diff : '' + diff);

            ctx.textAlign = 'left';
            ctx.fillStyle = '#333';
            ctx.font = '20px "DM Serif Text", serif';
            ctx.fillText('Hole ' + (i + 1) + ':', CANVAS_WIDTH / 2 - 140, y);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#1e3a5f';
            ctx.font = 'bold 20px "DM Serif Text", serif';
            ctx.fillText(scores[i] + ' strokes', CANVAS_WIDTH / 2, y);

            ctx.textAlign = 'right';
            ctx.fillStyle = diff <= 0 ? '#27ae60' : '#e74c3c';
            ctx.fillText('(' + diffStr + ')', CANVAS_WIDTH / 2 + 140, y);
        }

        // Total
        var totalDiff = totalScore - totalPar;
        var totalDiffStr = totalDiff === 0 ? 'Even Par!' :
            (totalDiff > 0 ? '+' + totalDiff + ' Over Par' : totalDiff + ' Under Par!');

        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH / 2 - 140, 135 + scores.length * 45 - 15);
        ctx.lineTo(CANVAS_WIDTH / 2 + 140, 135 + scores.length * 45 - 15);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.stroke();

        var totalY = 135 + scores.length * 45 + 10;
        ctx.fillStyle = '#1e3a5f';
        ctx.font = 'bold 22px "DM Serif Text", serif';
        ctx.textAlign = 'center';
        ctx.fillText('Total: ' + totalScore + ' / Par ' + totalPar, CANVAS_WIDTH / 2, totalY);

        ctx.font = 'bold 26px "DM Serif Text", serif';
        ctx.fillStyle = totalDiff <= 0 ? '#27ae60' : '#e74c3c';
        ctx.fillText(totalDiffStr, CANVAS_WIDTH / 2, totalY + 40);

        // Play again
        var btnW = 160;
        var btnH = 45;
        var btnX = CANVAS_WIDTH / 2 - btnW / 2;
        var btnY = CANVAS_HEIGHT - 80;

        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 10);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px "DM Serif Text", serif';
        ctx.textAlign = 'center';
        ctx.fillText('Play Again', CANVAS_WIDTH / 2, btnY + btnH / 2 + 1);
    }

    // ---------- Main Draw ----------

    function draw() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (gameState === 'title') {
            drawTitle();
            return;
        }

        if (gameState === 'gameOver') {
            drawGameOver();
            return;
        }

        drawCourse();
        drawObstacles();
        drawHoleTarget();

        if (gameState !== 'sinking' || ballScale > 0) {
            drawBall();
        }

        if (gameState === 'aiming' && isDragging) {
            drawAimLine();
        }

        drawHUD();

        if (gameState === 'holeDone') {
            drawHoleComplete();
        }
    }

    // ---------- Input ----------

    function handlePointerDown(e) {
        e.preventDefault();
        var pos = getCanvasPos(e);

        if (gameState === 'title') {
            var btnX = CANVAS_WIDTH / 2 - 80;
            var btnY = CANVAS_HEIGHT / 2 + 80;
            if (pos.x >= btnX && pos.x <= btnX + 160 && pos.y >= btnY && pos.y <= btnY + 50) {
                startGame();
            }
            return;
        }

        if (gameState === 'holeDone') {
            var bw = 160, bh = 45;
            var bx = CANVAS_WIDTH / 2 - bw / 2;
            var by = CANVAS_HEIGHT / 2 + 50;
            if (pos.x >= bx && pos.x <= bx + bw && pos.y >= by && pos.y <= by + bh) {
                scores.push(strokes);
                currentHole++;
                if (currentHole >= TOTAL_HOLES) {
                    gameState = 'gameOver';
                } else {
                    generateHole(currentHole);
                    gameState = 'aiming';
                }
            }
            return;
        }

        if (gameState === 'gameOver') {
            var rbw = 160, rbh = 45;
            var rbx = CANVAS_WIDTH / 2 - rbw / 2;
            var rby = CANVAS_HEIGHT - 80;
            if (pos.x >= rbx && pos.x <= rbx + rbw && pos.y >= rby && pos.y <= rby + rbh) {
                startGame();
            }
            return;
        }

        if (gameState === 'aiming') {
            var dx = pos.x - ball.x;
            var dy = pos.y - ball.y;
            if (dx * dx + dy * dy < 900) {
                isDragging = true;
                dragStart = { x: pos.x, y: pos.y };
                dragEnd = { x: pos.x, y: pos.y };
            }
        }
    }

    function handlePointerMove(e) {
        e.preventDefault();
        if (isDragging) {
            dragEnd = getCanvasPos(e);
        }
    }

    function handlePointerUp(e) {
        e.preventDefault();
        if (isDragging && gameState === 'aiming') {
            isDragging = false;
            var pos = getCanvasPos(e);
            dragEnd = pos;

            var dx = dragEnd.x - dragStart.x;
            var dy = dragEnd.y - dragStart.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 10) {
                var power = Math.min(dist / 10, MAX_POWER);
                var angle = Math.atan2(dy, dx);
                ball.vx = -Math.cos(angle) * power;
                ball.vy = -Math.sin(angle) * power;
                strokes++;
                gameState = 'rolling';
            }
        }
        isDragging = false;
    }

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mouseup', handlePointerUp);
    canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
    canvas.addEventListener('touchend', handlePointerUp, { passive: false });

    // ---------- Game Control ----------

    function startGame() {
        currentHole = 0;
        scores = [];
        generateHole(0);
        gameState = 'aiming';
        ballInHoleAnim = false;
        ballScale = 1;
    }

    // ---------- Main Loop ----------

    function gameLoop() {
        updateBall();

        // Sinking animation
        if (gameState === 'sinking') {
            holeAnimTimer++;
            ballScale = Math.max(0, 1 - holeAnimTimer / 20);
            ball.x += (holePos.x - ball.x) * 0.2;
            ball.y += (holePos.y - ball.y) * 0.2;

            if (holeAnimTimer > 25) {
                ballInHoleAnim = false;
                ballScale = 1;
                gameState = 'holeDone';
            }
        }

        draw();
        requestAnimationFrame(gameLoop);
    }

    gameLoop();
})();
