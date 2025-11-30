var canvas;
var gl;

// --- GLOBAL VARIABLE FIXES ---
var program; // FIXED: Make program global so render() can access it
var vPositionLoc; // FIXED: Make this global (was missing)

// --- New Global Variables for Lighting and Normals ---
var colorLoc;
var vNormalLoc; 
var shininessLoc; 
var ambientProductLoc, diffuseProductLoc, specularProductLoc;
var lightPositionLoc, viewMatrixLoc; 
var modelViewMatrixLoc, projectionMatrixLoc; // Ensure these are global

var vBuffer; 
var nBuffer;

// --- Global Variables for Maze Geometry ---
var wallPoints = [];
var wallNormals = [];
var wallObjects = []; 

var wireframeProgram; 
var wireframeColorLoc; 
var wireframeVPositionLoc; 
var wireframeModelViewMatrixLoc, wireframeProjectionMatrixLoc; 
var wireframePoints = [];
var wBuffer; // The buffer for wireframe lines

// --- Camera & Movement Update ---
var keysPressed = {}; 
var aspect; 
var camera = {
    position: vec3(0, 0, -20),
    yaw: Math.PI / 2,
    up: vec3(0, 1, 0),
    speed: 0.2,       
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

function quadWithNormals(a, b, c, d) {
    var t1 = subtract(cubeVertices[b], cubeVertices[a]);
    var t2 = subtract(cubeVertices[c], cubeVertices[b]);
    var normal = normalize(cross(t1, t2));
    
    wallPoints.push(cubeVertices[a], cubeVertices[b], cubeVertices[c]);
    wallNormals.push(normal, normal, normal);

    wallPoints.push(cubeVertices[a], cubeVertices[c], cubeVertices[d]);
    wallNormals.push(normal, normal, normal);
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
    // Indices for the 12 edges of a cube based on your cubeVertices array
    var indices = [
        0,1, 1,2, 2,3, 3,0, // Front Face Loop
        4,5, 5,6, 6,7, 7,4, // Back Face Loop
        0,4, 1,5, 2,6, 3,7  // Connecting Lines (Front to Back)
    ];

    for (var i = 0; i < indices.length; i++) {
        wireframePoints.push(cubeVertices[indices[i]]);
    }
}

function defineMazeGeometry() {
    createUnitCube();
    
    // Floor
    wallObjects.push({
        modelMatrix: mult(translate(0.0, -1.0, 0.0), scalem(10.0, 0.5, 10.0)),
        color: vec4(0.5, 0.5, 0.5, 1.0) 
    });
    
    // Back Wall 
    wallObjects.push({
        modelMatrix: mult(translate(0.0, 0.0, -5.0), scalem(10.0, 2.0, 0.5)),
        color: vec4(0.8, 0.4, 0.0, 1.0) 
    });
    
    // Left Wall
    wallObjects.push({
        modelMatrix: mult(translate(-5.0, 0.0, 0.0), scalem(0.5, 2.0, 10.0)),
        color: vec4(0.8, 0.4, 0.0, 1.0)
    });
    
    // Right Wall 
    wallObjects.push({
        modelMatrix: mult(translate(2.5, 0.0, 2.5), scalem(5.5, 2.0, 0.5)),
        color: vec4(0.8, 0.4, 0.0, 1.0)
    });
    
    // Center wall
    wallObjects.push({
        modelMatrix: mult(translate(2.5, 0.0, -2.5), scalem(0.5, 2.0, 5.0)),
        color: vec4(0.8, 0.4, 0.0, 1.0)
    });
    
    // Ceiling
    wallObjects.push({
        modelMatrix: mult(translate(0.0, 1.0, 0.0), scalem(10.0, 0.5, 10.0)),
        color: vec4(0.4, 0.4, 0.4, 1.0) 
    });
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);
    // Added polygon offset so lines draw cleanly over solids
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
    gl.enableVertexAttribArray( vPositionLoc );
    vNormalLoc = gl.getAttribLocation( program, "vNormal" );
    gl.enableVertexAttribArray( vNormalLoc );
    colorLoc = gl.getUniformLocation(program, "uColor");

    wireframeProgram = initShaders(gl, "wireframe-vertex-shader", "wireframe-fragment-shader");
    wireframeModelViewMatrixLoc = gl.getUniformLocation(wireframeProgram, "modelViewMatrix");
    wireframeProjectionMatrixLoc = gl.getUniformLocation(wireframeProgram, "projectionMatrix");
    wireframeColorLoc = gl.getUniformLocation(wireframeProgram, "uColor");
    wireframeVPositionLoc = gl.getAttribLocation(wireframeProgram, "vPosition");
    // Don't enable the array here yet, we will bind it in the render loop

    defineMazeGeometry();
    createWireframeCube();

    wBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(wireframePoints), gl.STATIC_DRAW);

    // Keep the polygon offset I mentioned in the previous fix!
    // This pushes the solid walls back slightly so the black lines sit cleanly on top
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 1.0);
    
    vBuffer = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(wallPoints), gl.STATIC_DRAW);
    
    nBuffer = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(wallNormals), gl.STATIC_DRAW);
    
    var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0); 
    var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0); 
    var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0); 
    
    var materialAmbient = vec4(1.0, 1.0, 1.0, 1.0);
    var materialDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
    var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
    var materialShininess = 30.0; 

    // We must use 'program' to set these uniforms
    gl.useProgram(program);
    gl.uniform4fv(ambientProductLoc, flatten(mult(lightAmbient, materialAmbient)));
    gl.uniform4fv(diffuseProductLoc, flatten(mult(lightDiffuse, materialDiffuse)));
    gl.uniform4fv(specularProductLoc, flatten(mult(lightSpecular, materialSpecular)));
    gl.uniform1f(shininessLoc, materialShininess);

    document.onkeydown = function(event) { keysPressed[event.key] = true; };
    document.onkeyup = function(event) { keysPressed[event.key] = false; };

    render();
}

function updateCamera() {
    var yaw = camera.yaw;
    var front = vec3(Math.cos(yaw), 0, Math.sin(yaw));
    var right = vec3(-Math.sin(yaw), 0, Math.cos(yaw)); 

    if (keysPressed['w']) camera.position = add(camera.position, scale(camera.speed, front));
    if (keysPressed['s']) camera.position = subtract(camera.position, scale(camera.speed, front));
    if (keysPressed['a']) camera.position = subtract(camera.position, scale(camera.speed, right));
    if (keysPressed['d']) camera.position = add(camera.position, scale(camera.speed, right));
    
    if (keysPressed['ArrowLeft']) camera.yaw -= camera.turnSpeed;
    if (keysPressed['ArrowRight']) camera.yaw += camera.turnSpeed;
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    // Re-bind Attribute Pointers for the Main Shader
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(vPositionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPositionLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.vertexAttribPointer(vNormalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormalLoc);

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
        gl.uniform4f(colorLoc, wall.color[0], wall.color[1], wall.color[2], wall.color[3]);
        gl.drawArrays(gl.TRIANGLES, 0, wallPoints.length); 
    }

    // --- Render Wireframe Outlines ---
    gl.useProgram(wireframeProgram);
    gl.uniformMatrix4fv(wireframeProjectionMatrixLoc, false, flatten(projectionMatrix));

    gl.bindBuffer(gl.ARRAY_BUFFER, wBuffer);
    gl.vertexAttribPointer(wireframeVPositionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(wireframeVPositionLoc);

    for (var i = 0; i < wallObjects.length; i++) {
        var wall = wallObjects[i];
        var modelViewMatrix = mult(viewMatrix, wall.modelMatrix);
        gl.uniformMatrix4fv(wireframeModelViewMatrixLoc, false, flatten(modelViewMatrix));

        gl.uniform4f(wireframeColorLoc, 0.0, 1.0, 0.0, 1.0); // Black Lines

        gl.depthMask(false); 
        
        // Draw LINES using the wireframePoints count, not the wallPoints count
        gl.drawArrays(gl.LINES, 0, wireframePoints.length);
        
        gl.depthMask(true);
    }

    window.requestAnimFrame(render);
}