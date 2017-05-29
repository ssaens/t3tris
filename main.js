/**
 * Created by dillon on 5/26/17.
 */

function main() {
    let view = new View();
    let t3tris = new T3tris();
    view.bind_application(t3tris);
    if (view.init()) {
        view.begin();
    }
}

/**
 * =================================================
 * # View
 * =================================================
 */

var gl;

function View() {
    this.app = null;
    this.fps = 30;

    this.sys_last = 0;
}

View.prototype = {

    init: function() {
        if (!this.app) {
            alert("no bound application");
            return false;
        }

        window.requestAnimationFrame = window.requestAnimationFrame
            || window.mozRequestAnimationFrame
            || window.webkitRequestAnimationFrame
            || window.msRequestAnimationFrame
            || function (f) {
                return setTimeout(f, 1000 / this.fps)
            };

        window.cancelAnimationFrame = window.cancelAnimationFrame
            || window.mozCancelAnimationFrame
            || function (requestID) {
                clearTimeout(requestID)
            };

        this.canvas = document.getElementById('game_area');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Initialize WebGL Context
        gl = null;
        gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        if (!gl) {
            alert('Unable to initialize OpenGL. Your browser may not support it');
            return false;
        }
        gl.clearColor(0.0, 0.0, 0.0, 0.0);

        this.width = this.canvas.width;
        this.height = this.canvas.height;
        gl.viewport(0.0, 0.0, this.width, this.height);

        this.canvas.style.background = 'linear-gradient(#0099ff, #99d6ff)';

        // Initialize Event Listeners
        let self = this;
        window.addEventListener('resize',      function(e) { self.app.resize_callback(e); });
        window.addEventListener('mousemove',   function(e) { self.app.cursor_callback(e); });
        window.addEventListener('keydown',     function(e) { self.app.keydown_callback(e); });
        window.addEventListener('keyup',       function(e) { self.app.keyup_callback(e); });
        window.addEventListener('mousewheel',  function(e) { self.app.scroll_callback(e); });
        window.addEventListener('mousedown',   function(e) { self.app.mousedown_callback(e); });
        window.addEventListener('mouseup',     function(e) { self.app.mouseup_callback(e); });

        // Initialize unisim
        this.app.set_view(this);
        this.app.init();

        return true;
    },

    bind_application: function(app) {
        this.app = app;
    },

    begin: function() {
        let self = this;
        this.id = requestAnimationFrame(function(timestamp) {
            self.update(timestamp);
        });
    },

    update: function(timestamp) {
        if (this.app.should_terminate()) {
            cancelAnimationFrame(this.id);
            return;
        }
        let dt = timestamp - this.sys_last;
        if (dt >= 1000.0 / this.fps) {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            this.app.update(dt);
            this.app.render();
            this.sys_last = timestamp;
        }
        let self = this;
        requestAnimationFrame(function(timestamp) { self.update(timestamp) });
    },

    set_screensize: function(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
        gl.viewport(0, 0, width, height);
    }
};


/**
 * =================================================
 * # State Management
 * =================================================
 */

function StateStack() {
    this.stack = [];
}

StateStack.prototype = {

    push: function(state) {
        this.stack.push(state);
    },

    pop: function() {
        if (this.stack.length) {
            return this.stack.pop();
        }
    },

    peek: function() {
        if (this.stack.length) {
            return this.stack[this.stack.length - 1];
        }
    },

    swap_state: function(state) {
        this.pop();
        this.push(state);
    },

};

/**
 * =================================================
 * # State
 * =================================================
 */

function State(root) {
    this.root = root;
}

State.prototype = {
    resize_callback: function(width, height) {},
    keydown_callback: function(key) {},
    keyup_callback: function(key) {},
    cursor_callback: function(cursor_x, cursor_y) {},
    scroll_callback: function(offset_x, offset_y) {},
    mousedown_callback: function(button) {},
    mouseup_callback: function(button) {},

    update: function(dt) {},
    render: function() {},
};

function InputLogger() {
    this.keys = {};
    this.buttons = {};
    this.last_x = 0;
    this.last_y = 0;
}

InputLogger.prototype = {

    set_key: function(id, val) {
        this.keys[id] = val;
    },

    set_button: function(id, val) {
        this.buttons[id] = val;
    },

    query_key: function(id) {
        return this.keys[id];
    },

    query_mouse: function(id) {
        return this.buttons[id];
    },

    set_last: function(x, y) {
        this.last_x = x;
        this.last_y = y;
    },

    get_last: function() {
        return {x: this.last_x, y: this.last_y};
    },
};


/**
 * =================================================
 * # Camera
 * =================================================
 */

function Camera() {
    this.world_up = vec3.fromValues(0, 1, 0);

    this.pos = vec3.fromValues(15, 10, 15);
    this.front = vec3.normalize(vec3.create(), vec3.fromValues(-1, -0.5, -1));
    this.up = vec3.create();
    this.right = vec3.create();

    this.fov = 45;
    this.ar = 1;
    this.n_clip = 0.1;
    this.f_clip = 100;
    this.update_vectors();
}

Camera.prototype = {
    get_view: function() {
        return mat4.lookAt(mat4.create(), this.pos, vec3.add(vec3.create(), this.pos, this.front), this.up);
    },

    get_projection: function() {
        return mat4.perspective(mat4.create(), this.fov, this.ar, this.n_clip, this.f_clip);
    },

    set_ar: function(width, height) {
        this.ar = width / height;
    },

    set_fov: function(fov) {
        this.fov = fov;
    },

    update_vectors: function() {
        vec3.normalize(this.right, vec3.cross(this.right, this.front, this.world_up));
        vec3.normalize(this.up, vec3.cross(this.up, this.right, this.front));
    },

};


/**
 * =================================================
 * # Shader
 * =================================================
 */

function Shader(v_src, f_src) {
    let v_shader = this.compile_shader(gl.VERTEX_SHADER, v_src);
    let f_shader = this.compile_shader(gl.FRAGMENT_SHADER, f_src);
    if (v_shader === null || f_shader === null) {
        return;
    } else {
        this.program = gl.createProgram();
        gl.attachShader(this.program, v_shader);
        gl.attachShader(this.program, f_shader);
        gl.linkProgram(this.program);
    }

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        console.log('Error linking shaders ' + v_src + ' ' + f_src);
        return;
    }

    this.attrs = {};
    this.proj = gl.getUniformLocation(this.program, 'proj');
    this.view = gl.getUniformLocation(this.program, 'view');
    this.model = gl.getUniformLocation(this.program, 'model');
}

Shader.prototype = {

    compile_shader: function(type, src) {
        let shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log('Error compiling shader ' + src + ': ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    },

    use: function() {
       gl.useProgram(this.program);
    },

    enable_attr: function(name) {
        let attribute = gl.getAttribLocation(this.program, name);
        console.log('enabling attribute ' + name);
        this.attrs[name] = attribute;
        gl.enableVertexAttribArray(attribute);
    },

    bind_model: function(model) {
        gl.uniformMatrix4fv(this.model, false, model);
    },

    bind_projection: function(proj) {
        gl.uniformMatrix4fv(this.proj, false, proj);
    },

    bind_view: function(view) {
        gl.uniformMatrix4fv(this.view, false, view);
    },

    bind_matrices: function(proj, view, model) {
        gl.uniformMatrix4fv(this.proj, false, proj);
        gl.uniformMatrix4fv(this.view, false, view);
        gl.uniformMatrix4fv(this.model, false, model);
    },

};


/**
 * =================================================
 * # Mesh
 * =================================================
 */

function Mesh(vertices, indices, normals, normal_indices) {
    this.vertices = new Float32Array(vertices);
    this.indices = new Uint16Array(indices);
    this.normals = new Float32Array(normals);
    this.normal_indicies = new Uint16Array(normal_indices);
    this.init();
}

Mesh.prototype = {
    init: function() {
        this.VBO = gl.createBuffer();
        this.EBO = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VBO);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.EBO);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this.nVBO = gl.createBuffer();
        this.nEBO = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.nVBO);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.nEBO);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.normal_indicies, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    },

    render: function(shader) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VBO);
        gl.vertexAttribPointer(shader.attrs.position, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.nVBO);
        gl.vertexAttribPointer(shader.attrs.normal, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.EBO);

        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    },
};


/**
 * =================================================
 * # GUI
 * =================================================
 */

Gui = (function() {
    let global_id = 0;
    function Gui(id='') {
        this.id = id ? id : 'gui_' + global_id++;
        this.elements = [];

        this.dom_element = document.createElement('div');
        this.dom_element.setAttribute('id', this.id);
        this.dom_element.setAttribute('class', 'gui');
        document.body.appendChild(this.dom_element);
    }
    return Gui;
})();

Gui.prototype = {

    add_element: function(element) {
        this.elements.push(element);
        this.dom_element.appendChild(element.dom_element);
    },

    get_id: function() {
        return this.id;
    },

    set_dimentions: function(w, h) {
        this.dom_element.setAttribute('width', w);
        this.dom_element.setAttribute('height', h);
    },

    remove: function() {
        this.dom_element.remove();
    },

    set_style: function(style) {
        Object.keys(style).forEach(function(key) {
            this.dom_element.style[key] = style[key];
        });
    },

};


GuiElement = (function() {
    let global_id = 0;
    function GuiElement(type='', id='') {
        this.id = id ? id : 'gui_elem_' + global_id++;
        this.dom_element = document.createElement('div');
        this.dom_element.setAttribute('id', this.id);
        this.dom_element.className = 'gui_elem ' + type;
        this.elements = [];
    }
    return GuiElement;
})();

GuiElement.prototype = {

    get_id: function() {
        return this.id;
    },

    remove: function() {
        this.dom_element.remove();
    },

    add_child: function(child) {
        this.elements.push(child);
        this.dom_element.appendChild(child.dom_element);
    },

    set_style: function(style) {
        Object.keys(style).forEach(function(key) {
            this.dom_element.style[key] = style[key];
        });
    },

};


function GuiText(text='', id='') {
    GuiElement.call(this, 'text', id='');
    this.text_node = document.createTextNode(text);
    this.dom_element.appendChild(this.text_node);
}

GuiText.prototype = Object.assign(Object.create(GuiElement.prototype), {

    set_text: function(text) {
        this.text_node.textContent = text;
    },

});


function GuiNode(html='', id='') {
    GuiElement.call(this, 'node', id);
    this.dom_element.innerHTML = html;
}

GuiText.prototype = Object.assign(Object.create(GuiElement.prototype), {

    set_text: function(html) {
        this.dom_element.innerHTML = html;
    },

});



function GuiButton(text='', id='') {
    GuiElement.call(this, 'button', id);
    this.text_node = document.createTextNode(text);
    this.dom_element.appendChild(this.text_node);
    this.dom_element.style.cursor = 'pointer';
    this.set_callback(function() {});
}

GuiButton.prototype = Object.assign(Object.create(GuiElement.prototype), {

    set_callback: function(f) {
        this.dom_element.addEventListener('mousedown', f);
    }

});


/**
 * =================================================
 * # Media Manager
 * =================================================
 */

const MENUS = {
    START: 0,
};

const MESHES = {
    CUBE: 0,
};

const SHADERS = {
    CUBE_FLAT: 0,
    CAGE: 1,
};

const TEXTURES = {

};

function MediaManager() {
    this.menus = {};
    this.meshes = {};
    this.shaders = {};
    this.textures = {};
}

MediaManager.prototype = {
    init: function() {
        this.load_menus();
        this.load_meshes();
        this.load_shaders();
        this.load_textures();
    },

    load_menus: function() {

    },

    load_meshes: function() {
        this.meshes[MESHES.CUBE] = generate_cube_mesh();
    },

    load_shaders: function() {
        let cube_shader = new Shader(cube_v_shader, cube_f_shader);
        cube_shader.enable_attr('position');
        cube_shader.enable_attr('normal');
        this.shaders[SHADERS.CUBE_FLAT] = cube_shader;

        let cage_shader = new Shader(cage_v_shader, cage_f_shader);
        cage_shader.enable_attr('position');
        cage_shader.enable_attr('normal');
        this.shaders[SHADERS.CAGE] = cage_shader;
    },

    load_textures: function() {

    },

    get_menu: function(id) {
        return this.menus[id];
    },

    get_mesh: function(id) {
        return this.meshes[id];
    },

    get_shader: function(id) {
        return this.shaders[id];
    },

    get_texture: function(id) {
        return this.textures[id];
    }
};

const media_manager = new MediaManager();


/**
 * =================================================
 * # T3tris
 * =================================================
 */

const constants = {
    GRID_WIDTH: 8,
    GRID_DEPTH: 8,
    GRID_HEIGHT: 10,
    QUEUE_SIZE: 5,
    TITLE_STR: '<span class="r">T</span><span class="g">3</span><span class="b">T</span><span class="y">R</span><span class="p">I</span><span class="o">S</span>'
};

function T3tris() {
    this.view = null;
    this.input_logger = new InputLogger();
    this.state_stack = new StateStack();
}

T3tris.prototype = {

    init: function() {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        media_manager.init();

        this.state_stack.push(new StartState(this));
    },

    update: function(dt) {
        let state = this.state_stack.peek();
        if (state) {
            state.update(dt);
        }
    },

    render: function() {
        let state = this.state_stack.peek();
        if (state) {
            state.render();
        }
    },

    set_view: function(view) {
        this.view = view;
    },

    resize_callback: function(e) {
        let w = window.innerWidth;
        let h = window.innerHeight;
        this.view.set_screensize(w, h);
        let state = this.state_stack.peek();
        if (state) {
            state.resize_callback(w, h);
        }
    },

    cursor_callback: function(e) {
        let state = this.state_stack.peek();
        if (state) {
            state.cursor_callback(e.clientX, e.clientY);
        }
    },

    keydown_callback: function(e) {
        this.input_logger.set_key(e.key, true);
        let state = this.state_stack.peek();
        if (state) {
            state.keydown_callback(e.key);
        }
    },

    keyup_callback: function(e) {
        this.input_logger.set_key(e.key, false);
        let state = this.state_stack.peek();
        if (state) {
            state.keyup_callback(e.key);
        }
    },

    scroll_callback: function(e) {
        let state = this.state_stack.peek();
        if (state) {
            state.scroll_callback(e);
        }
    },

    mousedown_callback: function(e) {
        this.input_logger.set_button(e.button, true);
        let state = this.state_stack.peek();
        if (state) {
            state.mousedown_callback(e.button);
        }
    },

    mouseup_callback: function(e) {
        this.input_logger.set_button(e.button, false);
        let state = this.state_stack.peek();
        if (state) {
            state.mouseup_callback(e.button);
        }
    },

    should_terminate: function() {
        return false;
    },
};


/**
 * =================================================
 * # T3tris States
 * =================================================
 */

/**
 *
 * @constructor
 */
function StartState(root) {
    State.call(this, root);
    this.init_menu();
}

StartState.prototype = Object.assign(Object.create(State.prototype), {

    init_menu: function() {
        let start_menu = new Gui('start');
        let title = new GuiNode(constants.TITLE_STR, 'title');
        let start_button = new GuiButton('start', 'start_button');
        let debug_button = new GuiButton('debug', 'debug_option');
        let self = this;
        start_button.set_callback(function() {
            start_menu.remove();
            self.root.state_stack.swap_state(new GameState(self.root));
        });
        debug_button.set_callback(function() {
            start_menu.remove();
           self.root.state_stack.swap_state(new ShowroomState(self.root));
        });
        start_menu.add_element(title);
        start_menu.add_element(start_button);
        start_menu.add_element(debug_button);
    }

});
StartState.prototype.constructor = StartState;


/**
 *
 * @constructor
 */
function PauseMenuState(root) {
    State.call(this, root);
}

PauseMenuState.prototype = Object.assign(Object.create(State.prototype), {

});
PauseMenuState.prototype.constructor = PauseMenuState;


/**
 *
 * @constructor
 */
function GameOverState(root) {
    State.call(this, root);
}

GameOverState.prototype = Object.assign(Object.create(State.prototype), {

});
GameOverState.prototype.constructor = GameOverState;


/**
 *
 * @constructor
 */
function GameState(root) {
    State.call(this, root);

    this.grid = {};

    this.queue = [];
    this.pieces = [];

    this.current_piece = null;
    this.held_piece = null;
    this.held_this_piece = false;

    this.step_timer = 0;
    this.step_interval = 1000;

    this.score = 0;
    this.num_pieces = 0;

    this.camera = new Camera();
    this.init();
}

GameState.prototype = Object.assign(Object.create(State.prototype), {

    init: function() {
        gl.enable(gl.CULL_FACE);

        this.cube_mesh = media_manager.get_mesh(MESHES.CUBE);
        this.piece_shader = media_manager.get_shader(SHADERS.CUBE_FLAT);
        this.cage_shader = media_manager.get_shader(SHADERS.CAGE);

        this.camera.set_ar(this.root.view.width, this.root.view.height);
        let proj = this.camera.get_projection();
        let view = this.camera.get_view();
        this.piece_shader.use();
        this.piece_shader.bind_matrices(proj, view, mat4.create());

        let cage_model = mat4.fromScaling(mat4.create(), vec3.fromValues(constants.GRID_WIDTH, constants.GRID_HEIGHT, constants.GRID_DEPTH))
        this.cage_shader.use();
        this.cage_shader.bind_matrices(proj, view, cage_model);
        gl.uniform3fv(gl.getUniformLocation(this.cage_shader.program, 'color'), vec3.fromValues(0.9, 0.9, 0.9));

        for (let i = 0; i < constants.QUEUE_SIZE; ++i) {
            this.queue.push(Piece.random());
        }

        this.current_piece = Piece.random();
    },

    update: function(dt) {
        this.step_timer += dt;
        this.handle_input();
        this.update_piece();
    },

    render: function() {
        gl.cullFace(gl.BACK);
        this.piece_shader.use();
        this.render_piece(this.current_piece);
        let self = this;
        this.pieces.forEach(function(piece) {
            self.render_piece(piece);
        });

        this.render_queue();

        gl.cullFace(gl.FRONT);
        this.cage_shader.use();
        this.render_cage();
    },

    update_piece: function() {
        if (this.step_timer < this.step_interval) {
            return;
        }
        this.step_timer = 0;
        let success = this.attempt_action(function(piece) { Piece.move(piece, DIRS.DOWN) });
        if (!success) {
            this.lock_piece();
        }
    },

    collides: function(piece) {
        let self = this;
        var collision = false;
        piece.offsets.forEach(
            function(offset) {
                let p = vec3.add(vec3.create(), piece.position, offset);
                if (p[1] < 0) {
                    collision = true;
                } else if (p[0] < 0) {
                    collision = true;
                } else if (p[0] >= constants.GRID_WIDTH) {
                    collision = true;
                } else if (p[2] < 0) {
                    collision = true;
                } else if (p[2] >= constants.GRID_DEPTH) {
                    collision = true;
                } else if (p in self.grid) {
                    collision = true;
                }
            }
        );
        return collision;
    },

    lock_piece: function() {
        let self = this,
            piece = this.current_piece;
        piece.offsets.forEach(
            function(offset) {
                let p = vec3.add(vec3.create(), piece.position, offset);
                self.grid[p] = piece;
            }
        );
        this.pieces.push(piece);
        this.current_piece = this.queue.shift();
        this.queue.push(Piece.random());
    },

    render_piece: function(piece) {
        var model;
        gl.uniform3fv(gl.getUniformLocation(this.piece_shader.program, 'color'), piece.color);
        let self = this;
        piece.offsets.forEach(
            function(offset) {
                model = mat4.create();
                mat4.translate(model, model, vec3.add(vec3.create(), piece.position, offset));
                self.piece_shader.bind_model(model);
                self.cube_mesh.render(self.piece_shader);
            }
        );
    },

    render_queue: function() {

    },

    render_cage: function() {
        this.cube_mesh.render(this.cage_shader);
    },

    hard_drop: function() {
        while(this.attempt_action(function(piece) {
            Piece.move(piece, DIRS.DOWN)
        })) {}
        this.lock_piece();
    },

    attempt_action: function(action) {
        let test_piece = Piece.copy(this.current_piece);
        action(test_piece);
        let success = !this.collides(test_piece);
        if (success) {
            action(this.current_piece);
        }
        return success;
    },

    handle_input: function() {
        let logger = this.root.input_logger;
        if (logger.query_key('Shift')) {
            this.attempt_action(function(piece) { Piece.move(piece, DIRS.DOWN) });
        }
    },

    keydown_callback: function(key) {
        if (key === 'ArrowLeft') {
            this.step_timer = 0;
            this.attempt_action(function(piece) { Piece.rotateZ(piece, -1) });
        } else if (key === 'ArrowRight') {
            this.step_timer = 0;
            this.attempt_action(function(piece) { Piece.rotateZ(piece, 1) });
        } else if (key === 'ArrowUp') {
            this.step_timer = 0;
            this.attempt_action(function(piece) { Piece.rotateY(piece, 1) });
        } else if (key === 'ArrowDown') {
            this.step_timer = 0;
            this.attempt_action(function(piece) { Piece.rotateX(piece, 1) });
        } else if (key === 'a') {
            this.attempt_action(function(piece) { Piece.move(piece, DIRS.LEFT) });
        } else if (key === 's') {
            this.attempt_action(function(piece) { Piece.move(piece, DIRS.FRONT) });
        } else if (key === 'd') {
            this.attempt_action(function(piece) { Piece.move(piece, DIRS.RIGHT) });
        } else if (key === 'w') {
            this.attempt_action(function(piece) { Piece.move(piece, DIRS.BACK) });
        } else if (key === ' ') {
            this.hard_drop();
        }
    },

    resize_callback: function(width, height) {
        this.camera.set_ar(width, height);
        let proj = this.camera.get_projection();
        this.piece_shader.use();
        this.piece_shader.bind_projection(proj);
    },

});
GameState.prototype.constructor = GameState;


/**
 *
 * @constructor
 */
function ShowroomState(root) {
    State.call(this, root);
    this.camera = new Camera();
    this.init();
}

ShowroomState.prototype = Object.assign(Object.create(State.prototype), {

    init: function() {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        // Init Menu
        let back = new Gui('back');
        let back_button = new GuiButton('back', 'back_button');
        let self = this;
        back_button.set_callback(function() {
           back.remove();
           self.root.state_stack.swap_state(new StartState(self.root));
        });
        back.add_element(back_button);

        // Get Mesh
        this.cube_mesh = media_manager.get_mesh(MESHES.CUBE);
        this.shader = media_manager.get_shader(SHADERS.CUBE_FLAT);

        this.camera.set_ar(this.root.view.width, this.root.view.height);
        let proj = this.camera.get_projection();
        let view = this.camera.get_view();
        this.shader.use();
        this.shader.bind_matrices(proj, view, mat4.create());

        this.focus = Piece.random();
    },

    update: function(dt) {
        this.handle_input();
    },

    render: function() {
        this.render_piece(this.focus);
    },

    render_piece: function(piece) {
        var model;
        gl.uniform3fv(gl.getUniformLocation(this.shader.program, 'color'), piece.color);
        let self = this;
        piece.offsets.forEach(
            function(offset) {
                model = mat4.create();
                mat4.translate(model, model, vec3.add(vec3.create(), piece.position, offset));
                self.shader.bind_model(model);
                self.cube_mesh.render(self.shader);
            }
        );
    },

    handle_input: function() {
        let logger = this.root.input_logger;
        if (logger.query_key('ArrowLeft')) {
            Piece.rotateZ(this.focus, -1);
        } else if (logger.query_key('ArrowRight')) {
            Piece.rotateZ(this.focus, 1);
        } else if (logger.query_key('ArrowUp')) {
            Piece.rotateY(this.focus, 1);
        } else if (logger.query_key('ArrowDown')) {
            Piece.rotateX(this.focus, 1);
        } else if (logger.query_key('a')) {
            Piece.move(this.focus, DIRS.LEFT);
        } else if (logger.query_key('s')) {
            Piece.move(this.focus, DIRS.FRONT);
        } else if (logger.query_key('d')) {
            Piece.move(this.focus, DIRS.RIGHT);
        } else if (logger.query_key('w')) {
            Piece.move(this.focus, DIRS.BACK);
        } else if (logger.query_key('Shift')) {
            Piece.move(this.focus, DIRS.DOWN);
        }
    },

});
ShowroomState.prototype.constructor = ShowroomState;


/**
 * =================================================
 * # T3tris Pieces
 * =================================================
 */

const Piece = {};

(function() {
    Piece.create = function(
        position,
        offsets,
        origin,
        color
    ) {
        return {
            // Define Block Shape and Location in grid
            position: position,
            offsets: offsets,

            // Point from which to apply transforms
            origin: origin,

            // Rendering info
            color: color,
        };
    };

    Piece.rotateX = function(piece, dir) {
        piece.offsets.forEach(
            function(offset) {
                vec3.rotateX(offset, offset, piece.origin, dir * Math.PI / 2);
                vec3.round(offset, offset);
            }
        );
    };

    Piece.rotateY = function(piece, dir) {
        piece.offsets.forEach(
            function(offset) {
                vec3.rotateY(offset, offset, piece.origin, dir * Math.PI / 2);
                vec3.round(offset, offset);
            }
        );
    };

    Piece.rotateZ = function(piece, dir) {
        piece.offsets.forEach(
            function(offset) {
                vec3.rotateZ(offset, offset, piece.origin, dir * Math.PI / 2);
                vec3.round(offset, offset);
            }
        );
    };

    Piece.move = function(piece, dir) {
        vec3.add(piece.position, piece.position, dir);
    };

    Piece.PIECES = {
        L: 0,
        I: 1,
        O: 2,
        S: 3,
        T: 4,
        TOTAL: 5,
    };

    let elements = {};
    let start_x = Math.floor(constants.GRID_WIDTH / 2);
    let start_z = Math.floor(constants.GRID_DEPTH / 2);
    let start_y = constants.GRID_HEIGHT;

    elements[Piece.PIECES.L] = Piece.create(
        vec3.fromValues(start_x, start_y, start_z),
        [   vec3.fromValues(0, 0, 0),
            vec3.fromValues(-1, 0, 0),
            vec3.fromValues(1, 0, 0),
            vec3.fromValues(1, 1, 0),
        ],
        vec3.create(),
        vec3.fromValues(0, 0, 1),
    );

    elements[Piece.PIECES.I] = Piece.create(
        vec3.fromValues(start_x, start_y, start_z),
        [   vec3.fromValues(0, 0, 0),
            vec3.fromValues(1, 0, 0),
            vec3.fromValues(2, 0, 0),
            vec3.fromValues(3, 0, 0),
        ],
        vec3.fromValues(1.5, 0.5, 0.5),
        vec3.fromValues(0.2, 0.8, 1),
    );

    elements[Piece.PIECES.O] = Piece.create(
        vec3.fromValues(start_x, start_y, start_z),
        [   vec3.fromValues(0, 0, 0),
            vec3.fromValues(1, 0, 0),
            vec3.fromValues(0, 1, 0),
            vec3.fromValues(1, 1, 0),
        ],
        vec3.fromValues(1, 1, 0),
        vec3.fromValues(1, 0.8, 0),
    );

    elements[Piece.PIECES.S] = Piece.create(
        vec3.fromValues(start_x, start_y, start_z),
        [   vec3.fromValues(0, 0, 0),
            vec3.fromValues(-1, 0, 0),
            vec3.fromValues(0, 1, 0),
            vec3.fromValues(1, 1, 0),
        ],
        vec3.create(),
        vec3.fromValues(1, 0.1, 0.1),
    );

    elements[Piece.PIECES.T] = Piece.create(
        vec3.fromValues(start_x, start_y, start_z),
        [   vec3.fromValues(0, 0, 0),
            vec3.fromValues(-1, 0, 0),
            vec3.fromValues(1, 0, 0),
            vec3.fromValues(0, 1, 0),
        ],
        vec3.create(),
        vec3.fromValues(0.8, 0, 1),
    );

    Piece.copy = function(piece) {
        let copied_offsets = [];
        piece.offsets.forEach(function(offset) {
            copied_offsets.push(vec3.copy(vec3.create(), offset));
        });
        return Piece.create(
            vec3.copy(vec3.create(), piece.position),
            copied_offsets,
            vec3.copy(vec3.create(), piece.origin),
            vec3.copy(vec3.create(), piece.color),
        );
    }

    Piece.get = function(piece_code) {
        return Piece.copy(elements[piece_code]);
    };

    Piece.random = function() {
        let p = Math.floor(Math.random() * Piece.PIECES.TOTAL);
        return Piece.get(p);
    };

})();

/**
 * =================================================
 * # Utility
 * =================================================
 */
const KEYS = {
    W: 0,
    A: 1,
    S: 2,
    D: 3,
    SPACE: 4,
    SHIFT: 5,
};

const KEYMAP = {

};

const MOUSE_BUTTONS = {
    LEFT: 0,
    MIDDLE: 1,
    RIGHT: 2,
};

const DIRS = {
    UP: vec3.fromValues(0, 1, 0),
    DOWN: vec3.fromValues(0, -1, 0),
    LEFT: vec3.fromValues(-1, 0, 0),
    RIGHT: vec3.fromValues(1, 0, 0),
    FRONT: vec3.fromValues(0, 0, 1),
    BACK: vec3.fromValues(0, 0, -1),
}

/**
 * =================================================
 * # Shaders
 * =================================================
 */

var cube_v_shader =
    'attribute vec3 position;' +
    'attribute vec3 normal;' +
    '' +
    'uniform mat4 proj;' +
    'uniform mat4 view;' +
    'uniform mat4 model;' +
    'uniform vec3 color;' +
    '' +
    'varying vec3 frag_pos;' +
    'varying vec3 face_normal;' +
    'varying vec3 cube_color;' +
    '' +
    'void main() {' +
    '   vec4 world_pos = model * vec4(position, 1.0);' +
    '   gl_Position = proj * view * world_pos;' +
    '   frag_pos = vec3(world_pos);' +
    '   face_normal = vec3(model * vec4(normal, 0.0));' +
    '   cube_color = color;' +
    '}';

var cube_f_shader =
    'precision mediump float;' +
    '' +
    'varying vec3 frag_pos;' +
    'varying vec3 face_normal;' +
    'varying vec3 cube_color;' +
    '' +
    'void main() {' +
    '   vec3 light_color = vec3(1.0, 1.0, 1.0);' +
    '   vec3 light_pos = vec3(0.0, 10.0, 5.0);' +
    '' +
    '   float ambient_str = 0.2;' +
    '   vec3 ambient = ambient_str * light_color;' +
    '' +
    '   vec3 light_dir = normalize(light_pos - frag_pos);' +
    '   float diff = max(dot(face_normal, light_dir), 0.0);' +
    '   vec3 diffuse = diff * light_color;' +
    '' +
    '   vec3 result = (ambient + diffuse) * cube_color;' +
    '   gl_FragColor = vec4(result, 1.0);' +
    '}';

var cage_v_shader =
    'attribute vec3 position;' +
    'attribute vec3 normal;' +
    '' +
    'uniform mat4 proj;' +
    'uniform mat4 view;' +
    'uniform mat4 model;' +
    'uniform vec3 color;' +
    '' +
    'varying vec3 frag_pos;' +
    'varying vec3 face_normal;' +
    'varying vec3 cube_color;' +
    'varying vec3 orig_pos;' +
    '' +
    'void main() {' +
    '   vec4 world_pos = model * vec4(position, 1.0);' +
    '   gl_Position = proj * view * world_pos;' +
    '   frag_pos = vec3(world_pos);' +
    '   face_normal = vec3(model * vec4(normal, 0.0));' +
    '   cube_color = color;' +
    '   orig_pos = position;' +
    '}';

var cage_f_shader =
    'precision mediump float;' +
    '' +
    'varying vec3 frag_pos;' +
    'varying vec3 face_normal;' +
    'varying vec3 cube_color;' +
    'varying vec3 orig_pos;' +
    '' +
    'void main() {' +
    '   float alpha;' +
    '   if (orig_pos.y == -0.5) {' +
    '       alpha = 0.0;' +
    '   } else {' +
    '       alpha = 0.2;' +
    '   }' +
    '   vec3 normal = -1.0 * face_normal;' +
    '   vec3 light_color = vec3(1.0, 1.0, 1.0);' +
    '   vec3 light_pos = vec3(0.0, 100.0, 0.0);' +
    '' +
    '   float ambient_str = 0.2;' +
    '   vec3 ambient = ambient_str * light_color;' +
    '' +
    '   vec3 light_dir = normalize(light_pos - frag_pos);' +
    '   float diff = max(dot(normal, light_dir), 0.0);' +
    '   vec3 diffuse = diff * light_color;' +
    '' +
    '   vec3 result = (ambient + diffuse) * cube_color;' +
    '   gl_FragColor = vec4(result, alpha);' +
    '   if (orig_pos.y == 0.5) {' +
    '       gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);' +
    '   }' +
    '}';

/**
 * =================================================
 * # Geometries
 * =================================================
 */

function generate_cube_mesh() {
    let normals = [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,

        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,

        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,

        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,

        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,

        0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,
    ];

    let vertices = [
        0, 0,  1,   // front square vertices
        1, 0,  1,
        1,  1,  1,
        0,  1,  1,

        1, 0,  1,
        1, 0, 0,
        1,  1, 0,
        1,  1,  1,

        1,  1,  1,
        1,  1, 0,
        0,  1, 0,
        0,  1,  1,

        0,  1,  1,
        0, 0, 0,
        0, 0,  1,
        0,  1, 0,

        0, 0, 0,
        1, 0, 0,
        1, 0,  1,
        0, 0,  1,

        0, 0, 0,   // back square vertices
        1, 0, 0,
        1,  1, 0,
        0,  1, 0,
    ];

    let indices = [
        0, 1, 2,    // pos z
        0, 2, 3,

        4, 5, 6,
        4, 6, 7,

        8, 9, 10,
        8, 10, 11,

        12, 13, 14,
        12, 15, 13,

        16, 17, 18,
        16, 18, 19,

        21, 23, 22,    // neg z
        21, 20, 23,
    ];

    return new Mesh(vertices, indices, normals);
}