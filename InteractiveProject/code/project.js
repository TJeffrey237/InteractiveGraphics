var canvas;
var gl;

var program;
var vPositionLoc;

var colorLoc;
var vNormalLoc; 
var shininessLoc; 
var ambientProductLoc, diffuseProductLoc, specularProductLoc;
var lightPositionLoc, viewMatrixLoc; 
var modelViewMatrixLoc, projectionMatrixLoc;

var vBuffer; 
var nBuffer;

var wallPoints = [];
var wallNormals = [];
var wallObjects = []; 
var wallUVs = [];

var vTexCoordLoc;
var texture;
var tBuffer;
var normalMapTexture;

var wireframeProgram; 
var wireframeColorLoc; 
var wireframeVPositionLoc; 
var wireframeModelViewMatrixLoc, wireframeProjectionMatrixLoc; 
var wireframePoints = [];
var wBuffer;

var isWireframeVisible = true;

var keysPressed = {}; 
var aspect; 
var camera = {
    position: vec3(-3.8, 0, 4),
    yaw: 3 * Math.PI / 2,
    up: vec3(0, 1, 0),
    height: 0.5,
    radius: 0.2,
    speed: 0.1,       
    turnSpeed: 0.03   
};

var cubeVertices = [
    vec4(-0.5, -0.5,  0.5, 1.0),
    vec4(-0.5,  0.5,  0.5, 1.0),
    vec4( 0.5,  0.5,  0.5, 1.0),
    vec4( 0.5, -0.5,  0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5,  0.5, -0.5, 1.0),
    vec4( 0.5,  0.5, -0.5, 1.0),
    vec4( 0.5, -0.5, -0.5, 1.0)
];

var uvCoords = [
    vec2(0.0, 0.0),
    vec2(0.0, 0.1),
    vec2(1.0, 0.0),
    vec2(1.0, 1.0)
]

function quadWithNormals(a, b, c, d) {
    var t1 = subtract(cubeVertices[b], cubeVertices[a]);
    var t2 = subtract(cubeVertices[c], cubeVertices[b]);
    var normal = normalize(cross(t1, t2));
    
    wallPoints.push(cubeVertices[a], cubeVertices[b], cubeVertices[c]);
    wallNormals.push(normal, normal, normal);

    wallPoints.push(cubeVertices[a], cubeVertices[c], cubeVertices[d]);
    wallNormals.push(normal, normal, normal);

    wallUVs.push(uvCoords[0], uvCoords[1], uvCoords[2]);
    wallUVs.push(uvCoords[0], uvCoords[2], uvCoords[3]);
}

function createUnitCube() {
    quadWithNormals( 1, 0, 3, 2 ); 
    quadWithNormals( 2, 3, 7, 6 ); 
    quadWithNormals( 3, 0, 4, 7 ); 
    quadWithNormals( 6, 5, 1, 2 ); 
    quadWithNormals( 4, 5, 6, 7 ); 
    quadWithNormals( 5, 4, 0, 1 ); 
}

function createWireframeCube() {
    var indices = [
        0,1, 1,2, 2,3, 3,0,
        4,5, 5,6, 6,7, 7,4,
        0,4, 1,5, 2,6, 3,7
    ];

    for (var i = 0; i < indices.length; i++) {
        wireframePoints.push(cubeVertices[indices[i]]);
    }
}

function defineMazeGeometry() {
    createUnitCube();

    function createWall(translationVec, scaleVec, color) {
        var scaleX = scaleVec[0];
        var scaleY = scaleVec[1];
        var scaleZ = scaleVec[2];

        var transX = translationVec[0];
        var transY = translationVec[1];
        var transZ = translationVec[2]; 
        // calculate the bounding boxes for each cube
        var xmin = transX - scaleX / 2.0;
        var xmax = transX + scaleX / 2.0;
        var ymin = transY - scaleY / 2.0;
        var ymax = transY + scaleY / 2.0;
        var zmin = transZ - scaleZ / 2.0;
        var zmax = transZ + scaleZ / 2.0;

        // cannot pass through floor and ceiling
        var isPassable = (ymin > 0.0);

        return {
            modelMatrix: mult(translate(translationVec), scalem(scaleVec)),
            color: color,
            xmin: xmin, xmax: xmax,
            ymin: ymin, ymax: ymax,
            zmin: zmin, zmax: zmax,
            isPassable: isPassable
        };
    }
    // ADDING WALLS: FORMAT: (TRANSLATE, SCALE, COLOR)
        // colors are all just white cause I use a texture
    // floor
    wallObjects.push(createWall(vec3(0.0, -1.0, 0.0), vec3(10.0, 0.2, 10.0), vec4(1.0, 1.0, 1.0, 1.0))); 
    // back Wall 
    wallObjects.push(createWall(vec3(0.0, 0.0, -5.0), vec3(10.0, 2.0, 0.2), vec4(1.0, 1.0, 1.0, 1.0)));
    // front wall
    wallObjects.push(createWall(vec3(0.0, 0.0, 5.0), vec3(10.0, 2.0, 0.2), vec4(1.0, 1.0, 1.0, 1.0))); 
    // left wall
    wallObjects.push(createWall(vec3(-5.0, 0.0, 0.0), vec3(0.2, 2.0, 10.0), vec4(1.0, 1.0, 1.0, 1.0)));
    // all the inner walls
    wallObjects.push(createWall(vec3(-3.0, 0.0, 3.5), vec3(0.2, 2.0, 3.0), vec4(1.0, 1.0, 1.0, 1.0)));
    wallObjects.push(createWall(vec3(-4.5, 0.0, 0), vec3(1.0, 2.0, 3.0), vec4(1.0, 1.0, 1.0, 1.0)));
    wallObjects.push(createWall(vec3(-2.0, 0.0, -2.0), vec3(2.0, 2.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0)));
    wallObjects.push(createWall(vec3(-1.0, 0.0, -3.2), vec3(1.0, 2.0, 3.5), vec4(1.0, 1.0, 1.0, 1.0)));
    wallObjects.push(createWall(vec3(0.0, 0.0, 0.5), vec3(5.0, 2.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0)));
    wallObjects.push(createWall(vec3(3.0, 0.0, -0.8), vec3(1.0, 2.0, 6.0), vec4(1.0, 1.0, 1.0, 1.0)));
    wallObjects.push(createWall(vec3(3.0, 0.0, 4.1), vec3(1.0, 2.0, 2.0), vec4(1.0, 1.0, 1.0, 1.0)));
    wallObjects.push(createWall(vec3(-0.5, 0.0, 2.0), vec3(0.5, 2.0, 2.5), vec4(1.0, 1.0, 1.0, 1.0)));
    wallObjects.push(createWall(vec3(1.0, 0.0, 3.8), vec3(0.5, 2.0, 2.5), vec4(1.0, 1.0, 1.0, 1.0)));
    // right wall
    wallObjects.push(createWall(vec3(5.0, 0.0, 1.0), vec3(0.2, 2.0, 8.0), vec4(1.0, 1.0, 1.0, 1.0)));
    // ceiling
    wallObjects.push(createWall(vec3(0.0, 1.0, 0.0), vec3(10.0, 0.2, 10.0), vec4(1.0, 1.0, 1.0, 1.0)));
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 1.0);

    aspect = gl.canvas.width / gl.canvas.height;

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    
    ambientProductLoc = gl.getUniformLocation(program, "ambientProduct");
    diffuseProductLoc = gl.getUniformLocation(program, "diffuseProduct");
    specularProductLoc = gl.getUniformLocation(program, "specularProduct");
    lightPositionLoc = gl.getUniformLocation(program, "lightPosition");
    shininessLoc = gl.getUniformLocation(program, "shininess");
    
    vPositionLoc = gl.getAttribLocation( program, "vPosition" );
    vNormalLoc = gl.getAttribLocation( program, "vNormal" );
    gl.enableVertexAttribArray( vPositionLoc );
    gl.enableVertexAttribArray( vNormalLoc );
    colorLoc = gl.getUniformLocation(program, "uColor");

    wireframeProgram = initShaders(gl, "wireframe-vertex-shader", "wireframe-fragment-shader");
    wireframeModelViewMatrixLoc = gl.getUniformLocation(wireframeProgram, "modelViewMatrix");
    wireframeProjectionMatrixLoc = gl.getUniformLocation(wireframeProgram, "projectionMatrix");
    wireframeColorLoc = gl.getUniformLocation(wireframeProgram, "uColor");
    wireframeVPositionLoc = gl.getAttribLocation(wireframeProgram, "vPosition");
    gl.enableVertexAttribArray(wireframeVPositionLoc);

    vTexCoordLoc = gl.getAttribLocation(program, "vTexCoord");
    gl.enableVertexAttribArray(vTexCoordLoc);

    defineMazeGeometry();
    createWireframeCube();

    wBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(wireframePoints), gl.STATIC_DRAW);

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 1.0);
    
    vBuffer = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(wallPoints), gl.STATIC_DRAW);
    
    nBuffer = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(wallNormals), gl.STATIC_DRAW);

    tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(wallUVs), gl.STATIC_DRAW);

    // intializing texture img
    var image = document.createElement('img');
    image.crossOrigin = "anonymous";
    image.onload = function() {
        configureTexture(image);
    };
    image.src = "../Textures/stone.jpg";
    // initializing normal map
    var normalMapImage = document.createElement('img');
    normalMapImage.crossOrigin = "anonymous";
    normalMapImage.onload = function() {
        configureNormalMapTexture(normalMapImage);
    };
    normalMapImage.src = "../Textures/stone_normal.jpg";
    
    var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0); 
    var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0); 
    var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0); 
    
    var materialAmbient = vec4(1.0, 1.0, 1.0, 1.0);
    var materialDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
    var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
    var materialShininess = 30.0; 

    gl.useProgram(program);
    gl.uniform4fv(ambientProductLoc, flatten(mult(lightAmbient, materialAmbient)));
    gl.uniform4fv(diffuseProductLoc, flatten(mult(lightDiffuse, materialDiffuse)));
    gl.uniform4fv(specularProductLoc, flatten(mult(lightSpecular, materialSpecular)));
    gl.uniform1f(shininessLoc, materialShininess);

    // records the keys
    document.onkeydown = function(event) { keysPressed[event.key] = true; };
    document.onkeyup = function(event) { keysPressed[event.key] = false; };

    // button to toggle the wireframe
    var toggleButton = document.getElementById("wireframeToggle");
    toggleButton.onclick = function() {
        isWireframeVisible = !isWireframeVisible; 
        if (isWireframeVisible) {
            toggleButton.textContent = "Toggle Wireframe (ON)";
        } else {
            toggleButton.textContent = "Toggle Wireframe (OFF)";
        }
    };

    render();
}

// configures texture images
function configureTexture(image) {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // Flips image for WebGL coordinates
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    
    // mip mapping
    gl.generateMipmap(gl.TEXTURE_2D); 
    
    // set texture wrapping and filtering things
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

// configures the normal map
function configureNormalMapTexture(image) {
    normalMapTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1); // Use texture unit 1
    gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); 
}

// handles collision checks
function checkCollision(nextPos, wall) {
    var r = camera.radius;
    var px = nextPos[0];
    var py = nextPos[1];
    var pz = nextPos[2];

    // collision on x-z plane
    var x_collide = (px + r > wall.xmin) && (px - r < wall.xmax);
    var z_collide = (pz + r > wall.zmin) && (pz - r < wall.zmax);
    
    // collision on y axis
    var y_collide = (py + 0.1 > wall.ymin) && (py - camera.height + 0.1 < wall.ymax);

    // collision is true if it is hitting on all three axes
    if (wall.isPassable) {
        return x_collide && z_collide && (py < wall.ymax) && (py > wall.ymin);
    } else {
        return x_collide && z_collide && y_collide;
    }
}

// handles camera movement and collision
function updateCamera() {
    var yaw = camera.yaw;
    var front = vec3(Math.cos(yaw), 0, Math.sin(yaw));
    var right = vec3(-Math.sin(yaw), 0, Math.cos(yaw)); 
    var movementVec = vec3(0, 0, 0);

    if (keysPressed['w']) movementVec = add(movementVec, scale(camera.speed, front));
    if (keysPressed['s']) movementVec = subtract(movementVec, scale(camera.speed, front));
    if (keysPressed['a']) movementVec = subtract(movementVec, scale(camera.speed, right));
    if (keysPressed['d']) movementVec = add(movementVec, scale(camera.speed, right));
    
    // calculate the proposed position
    var nextPos = add(camera.position, movementVec);
    var canMove = true;

    // checking for collisions against all walls
    for (var i = 0; i < wallObjects.length; i++) {
        if (checkCollision(nextPos, wallObjects[i])) {
            canMove = false;
            break; 
        }
    }
    // if no collision occurs
    if (canMove) {
        camera.position = nextPos;
    }
    
    // for looking left/right
    if (keysPressed['ArrowLeft']) camera.yaw -= camera.turnSpeed;
    if (keysPressed['ArrowRight']) camera.yaw += camera.turnSpeed;
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // use the default program first
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(vPositionLoc, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.vertexAttribPointer(vNormalLoc, 3, gl.FLOAT, false, 0, 0);

    // Bind Texture and UV Buffer
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);

    // Bind Normal Map Texture
    gl.activeTexture(gl.TEXTURE1); 
    gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
    gl.uniform1i(gl.getUniformLocation(program, "uNormalMap"), 1);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.vertexAttribPointer(vTexCoordLoc, 2, gl.FLOAT, false, 0, 0);

    updateCamera();
    
    var projectionMatrix = perspective(90, aspect, 0.1, 100.0);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    var yaw = camera.yaw;
    var front = vec3(Math.cos(yaw), 0, Math.sin(yaw));
    var target = add(camera.position, front);
    var viewMatrix = lookAt(camera.position, target, camera.up);

    gl.uniform4fv(lightPositionLoc, flatten(vec4(0.0, 0.0, 2.0, 1.0)));
    
    for (var i = 0; i < wallObjects.length; i++) {
        var wall = wallObjects[i];
        var modelViewMatrix = mult(viewMatrix, wall.modelMatrix);
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
        gl.drawArrays(gl.TRIANGLES, 0, wallPoints.length); 
    }

    // rendering the wireframe with a new program
    if(isWireframeVisible) {
        gl.useProgram(wireframeProgram);
        gl.uniformMatrix4fv(wireframeProjectionMatrixLoc, false, flatten(projectionMatrix));

        gl.bindBuffer(gl.ARRAY_BUFFER, wBuffer);
        gl.vertexAttribPointer(wireframeVPositionLoc, 4, gl.FLOAT, false, 0, 0);

        for (var i = 0; i < wallObjects.length; i++) {
            var wall = wallObjects[i];
            var modelViewMatrix = mult(viewMatrix, wall.modelMatrix);
            gl.uniformMatrix4fv(wireframeModelViewMatrixLoc, false, flatten(modelViewMatrix));

            gl.uniform4f(wireframeColorLoc, 0.0, 1.0, 0.0, 1.0);

            gl.depthMask(false); 
            gl.drawArrays(gl.LINES, 0, wireframePoints.length);
            gl.depthMask(true);
        }
    }

    window.requestAnimFrame(render);
}