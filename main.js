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
                return setTimeout(f, 1000 / 60)
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

        // Initialize Event Listeners
        let self = this;
        window.addEventListener     ('resize',      function(e) { self.app.resize_callback(e); });
        this.canvas.addEventListener('mousemove',   function(e) { self.app.cursor_callback(e); });
        this.canvas.addEventListener('keydown',     function(e) { self.app.keydown_callback(e); });
        this.canvas.addEventListener('keyup',       function(e) { self.app.keyup_callback(e); });
        this.canvas.addEventListener('mousewheel',  function(e) { self.app.scroll_callback(e); });
        this.canvas.addEventListener('mousedown',   function(e) { self.app.mousedown_callback(e); });
        this.canvas.addEventListener('mouseup',     function(e) { self.app.mouseup_callback(e); });

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

function State() {}

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
 * # Scene
 * =================================================
 */

function Camera() {
    this.world_up = vec3.create();

    this.position = vec3.create();
    this.up = vec3.create();
    this.right = vec3.create();
    this.front = vec3.create();
}

Camera.prototype = {

};


/**
 * =================================================
 * # Shader
 * =================================================
 */

function Shader() {

}

Shader.prototype = {

};


/**
 * =================================================
 * # Mesh
 * =================================================
 */

function Mesh() {

}

Mesh.prototype = {

};


/**
 * =================================================
 * # GUI
 * =================================================
 */

Gui = (function() {
    let global_id = 0;
    function Gui() {
        this.id = 'gui' + global_id++;
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

    update: function(dt) {

    },

    render: function() {

    },

    get_id: function() {
        return this.id;
    },

    set_position: function(p) {
        this.dom_element.style.left = p[0] + 'px';
        this.dom_element.style.top = p[1] + 'px';
    },

};


GuiElement = (function() {
    let global_id = 0;
    function GuiElement() {
        this.id = 'gui_elem' + global_id++;
        this.dom_element = document.createElement('div');
        this.dom_element.setAttribute('id', this.id);
        this.dom_element.setAttribute('class', 'gui_elem');
        this.set_position(vec2.create());
    }
    return GuiElement;
})();

GuiElement.prototype = {

    set_position: function(p) {
        this.dom_element.style.left = p[0] + 'px';
        this.dom_element.style.top = p[1] + 'px';
    },

    trigger: function() {

    },

    get_id: function() {
        return this.id;
    }

};


function GuiText(text='') {
    GuiElement.call(this);
    this.text_node = document.createTextNode(text);
    this.dom_element.appendChild(this.text_node);
}

GuiText.prototype = Object.assign(Object.create(GuiElement.prototype), {

    set_text: function(text) {
        this.text_node.textContent = text;
    },

    set_textsize: function() {

    },

});


function GuiButton(text='') {
    GuiElement.call(this);
    this.text_node = document.createTextNode(text);
    this.dom_element.appendChild(this.text_node);
}

GuiButton.prototype = Object.assign(Object.create(GuiElement.prototype), {

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

};

const SHADERS = {

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

    },

    load_shaders: function() {

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

        this.state_stack.push(new StartState());
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
        this.camera.set_ar(w, h);
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
        let state = this.state_stack.peek();
        if (state) {
            state.keydown_callback(e.keyCode);
        }
    },

    keyup_callback: function(e) {
        let state = this.state_stack.peek();
        if (state) {
            state.keyup_callback(e.keyCode);
        }
    },

    scroll_callback: function(e) {
        let state = this.state_stack.peek();
        if (state) {
            state.scroll_callback(e.scroll);
        }
    },

    mousedown_callback: function(e) {
        let state = this.state_stack.peek();
        if (state) {
            state.mousedown_callback(e);
        }
    },

    mouseup_callback: function(e) {
        let state = this.state_stack.peek();
        if (state) {
            state.mouseup_callback();
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
function StartState() {
    State.call(this);
}

StartState.prototype = Object.assign(Object.create(State.prototype), {

});
StartState.prototype.constructor = StartState;

/**
 *
 * @constructor
 */
function PauseMenuState() {
    State.call(this);
}

PauseMenuState.prototype = Object.assign(Object.create(State.prototype), {

});
PauseMenuState.prototype.constructor = PauseMenuState;

/**
 *
 * @constructor
 */
function GameOverState() {
    State.call(this);
}

GameOverState.prototype = Object.assign(Object.create(State.prototype), {

});
GameOverState.prototype.constructor = GameOverState;

/**
 *
 * @constructor
 */
function GameState() {
    State.call(this);

    this.grid_width = constants.GRID_WIDTH;
    this.grid_depth = constants.GRID_DEPTH;
    this.grid_height = constants.GRID_HEIGHT;
    this.grid = [];

    this.queue = [];
    this.pieces = [];

    this.camera = new Camera();
    this.init();
}

GameState.prototype = Object.assign(Object.create(State.prototype), {

    update: function(dt) {

    },

    render: function() {
        this.pieces.forEach(function(piece) {
            this.render_piece(piece);
        });
    },

    init: function() {
        for (let i = 0; i < this.grid_width * this.grid_depth * this.grid_height; ++i) {
            this.grid.push(false);
        }

        for (let i = 0; i < constants.QUEUE_SIZE; ++i) {
            this.queue.get_random_piece();
        }
    },

    get_random_piece: function() {

    },

    update_piece: function(piece) {

    },

    check_collisions: function(piece) {

    },

    lock_piece: function(piece) {

    },

    render_piece: function(piece) {

    },

    render_cage: function() {
        
    }

});
GameState.prototype.constructor = GameState;

/**
 *
 * @constructor
 */
function ShowroomState() {
    this.camera = new Camera();
}

ShowroomState.prototype = Object.assign(Object.create(State.prototype), {

    update: function() {

    },

    render: function() {

    },

});
ShowroomState.prototype.constructor = ShowroomState;


/**
 * =================================================
 * # T3tris Pieces
 * =================================================
 */

const Piece = {};

Piece.create = function(
    origin,
    start_rotation,
    rotation_origin,
    mesh_id,
    shader_id,
) {
    return {
        origin: origin,
        model: start_rotation,
        rotation_origin: rotation_origin,
        mesh: media_manager.get_mesh(mesh_id),
        shader: media_manager.get_shader(shader_id),
    };
};

Piece.random = function() {

};

Piece.rotateX = function(piece) {

};

Piece.rotateY = function(piece) {

};

Piece.rotateZ = function(piece) {

};

(function() {
    let PIECE_L = Piece.create();

    Piece.pices = [];
})();

Piece.prototype = {

    rotateX: function() {

    },

    rotateY: function() {

    },

    rotateZ: function() {

    },

    position: vec3.create(),
    offsets: [],
    mesh: null,
    model: mat4.create(),

};

const pieces = [];

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

/**
 * =================================================
 * # Shaders
 * =================================================
 */


/**
 * =================================================
 * # Geometries
 * =================================================
 */
