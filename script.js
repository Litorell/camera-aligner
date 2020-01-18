

//
// UV's:
// Arrays of length 2.
// These are always measured from the center point of the image,
// where positive U is to the right and positive V is up.
// They are defined such that 1 unit is the distance from the 
// centre to the farthest edge of the image. 
//

class Corner {
    /**
     * 
     * @param {number[2]} uvCenter 
     * @param {number[2]} point1 (Relative to uvCenter)
     * @param {number[2]} point2 (Relative to uvCenter)
     */
    constructor(uvCenter, point1, point2) {
        this.uvCenter = uvCenter
        this.point1 = point1
        this.point2 = point2
    }

    get points() {
        return [this.uvCenter, this.point1, this.point2]
    }

    pointFromIndex(index) {
        if (index === 0) {
            return this.point1
        }
        return this.point2
    }
}

let origin = [0, 0]

let corners = [
    new Corner([-0.30, 0.07], [0.04,  0.24], [-0.08, -0.10]),
    new Corner([ 0.36, 0.21], [0.11, -0.02], [ 0.17,  0.27])
]

let zoomRatio = 1
let imageOffset = [0, 0] // UV units


let axisColors = {
    x: "#eb4034",
    y: "#3ec94c",
    z: "#1e6be6"
}



let img = document.getElementById("source-img")
let canvas = document.getElementById("main-canvas")
let ctx = canvas.getContext("2d")

function resizeCanvas() {
    let container = document.getElementById("canvas-container")
    canvas.width = container.offsetWidth
    canvas.height = container.offsetHeight
    draw()
}
window.addEventListener("resize", () => resizeCanvas())

function imgCanvasSize() {
    let coefficient = Math.max(img.naturalWidth / canvas.width, img.naturalHeight / canvas.height) / zoomRatio
    return [img.naturalWidth / coefficient, img.naturalHeight / coefficient]
}

function pixelsToUVRelative(x, y) {
    let coefficient = 2 / Math.max(...imgCanvasSize())
    return [x * coefficient, y * coefficient * -1]
}

function pixelsToUVAbsolute(x, y) {
    let p = pixelsToUVRelative(x - canvas.width / 2, y - canvas.height / 2)
    let u = p[0] - imageOffset[0]
    let v = p[1] - imageOffset[1]

    return [u, v]
}

function UVToPixelsRelative(u, v) {
    let coefficient = Math.max(...imgCanvasSize()) / 2
    return [u * coefficient, v * coefficient * -1]

}

function UVToPixelsAbsolute(u, v) {
    let p = UVToPixelsRelative(u + imageOffset[0], v + imageOffset[1])
    let x = p[0] + canvas.width / 2
    let y = p[1] + canvas.height / 2
    return [x, y]
}

function distanceToPoint(point1, point2) {
    let total = 0
    for (let i = 0; i < point1.length; i++) {
        total += Math.pow(point1[i] - point2[i], 2)
    }
    return Math.sqrt(total)
}

function closestPoint(point, points) {
    return points.map(x => { return { point: x, dist: distanceToPoint(x, point)} })
    .reduce((prev, curr) => {
        return prev.dist > curr.dist ? curr : prev
    }).point
}


function drawCircle(x, y, radius, fillColor, strokeColor = "#00000000", strokeWidth = 0) {
    ctx.beginPath()
    ctx.fillStyle = fillColor
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fill()
    if (strokeWidth) ctx.stroke()
}

function drawLineUV(startX, startY, endX, endY, color=null, width=null) {
    let startPx = UVToPixelsAbsolute(startX, startY)
    let endPx = UVToPixelsAbsolute(endX, endY)

    ctx.beginPath()
    if (color) ctx.strokeStyle = color
    if (width) ctx.lineWidth = width
    ctx.moveTo(...startPx)
    ctx.lineTo(...endPx)
    ctx.stroke()
}


function getVanishingPoints() {
    let vanishingPoints = []
    
    for (let i = 0; i < 2; i++) {
        
        let o1 = corners[0].uvCenter
        let o2 = corners[1].uvCenter
    
        let p1 = Vector.subtraction(o1, corners[0].pointFromIndex(i))
        let p2 = Vector.subtraction(o2, corners[1].pointFromIndex(i))
    
        let m = new Matrix([
            [p1[0], -p2[0]],
            [p1[1], -p2[1]]
        ])
        let v = [
            o2[0] - o1[0],
            o2[1] - o1[1]
        ]
    
        let c = m.inverse.transformVector(v)
    
        let vp = Vector.addition(o1, Vector.scalarMultiplication(p1, c[0]))
        vanishingPoints.push(vp)
    }

    return vanishingPoints
}

function getFocalLength() {
    let v = calcResults.vanishingPoints

    let f = Math.sqrt(-v[0][0] * v[1][0] - v[0][1] * v[1][1]) / 2 * calcResults.sensorLength
    return f
}


/**
 * Returns the transform for the world with the camera at [0, 0, 0] facing [0, 0, -1] with [0, 1, 0] up.
 */
function getWorldTransform() {
    let axis1 = document.getElementById("axis1").value
    let axis2 = document.getElementById("axis2").value

    let distance = calcResults.focalLength / calcResults.sensorLength * 2
    let vp1 = calcResults.vanishingPoints[0]
    let vp2 = calcResults.vanishingPoints[1]

    let vectors = [
        [],
        [],
        []
    ]

    let axes = {
        "x": 0,
        "y": 1,
        "z": 2
    }

    let vector1 = Vector.normalize([vp1[0], vp1[1], -distance])
    let vector2 = Vector.normalize([vp2[0], vp2[1], -distance])

    vector1 = Vector.scalarMultiplication(vector1, Number(axis1[0] + "1"))
    vector2 = Vector.scalarMultiplication(vector2, Number(axis2[0] + "1"))

    vectors[axes[axis1[1]]] = vector1
    vectors[axes[axis2[1]]] = vector2

    for (let i = 0; i < 3; i++) {
        if (vectors[i].length === 0) {
            vectors[i] = Vector.crossProduct(vectors[(i + 1) % 3], vectors[(i + 2) % 3])
            break
        }
    }

    return new Matrix(vectors).transpose
}

function getLocation() {
    let distance = Number(document.getElementById("distance-to-origin").value)

    let point = Vector.scalarMultiplication(Vector.normalize(projectPointLocalInverse(origin, 1)), distance)


    let m = calcResults.worldTransform.inverse

    return Vector.scalarMultiplication(m.transformVector(point), -1)

}


function getEulerRotation() {
    let inverse = calcResults.worldTransform.inverse
    let m = inverse.matrix

    // Rotation axes:
    // alpha = x, beta = y, gamma = z

    let gammas = [Math.atan(m[1][0] / m[0][0])] // (x_y / x_x)
    gammas.push(gammas[0] + Math.PI)

    let betas = [-Math.sin(m[2][0])] // x_z
    betas.push(Math.PI - betas[0])

    let angles = []

    gammas.forEach(gamma => {
        let gammaMat = Matrix.rotation3D(2, gamma)

        betas.forEach(beta => {
            let betaMat = Matrix.rotation3D(1, beta)

            let mat = Matrix.multiplication(betaMat.inverse, Matrix.multiplication(gammaMat.inverse, inverse)).matrix
            let alpha = Math.atan2(mat[2][1], mat[1][1]) // y_z, y_y
            let alphaMat = Matrix.rotation3D(0, alpha)

            let combined = Matrix.multiplication(gammaMat, Matrix.multiplication(betaMat, alphaMat))
            

            let error = 0;
            // Sum of squares of errors
            combined.matrix.forEach((row, i) => {
                row.forEach((element, j) => {
                    error += Math.pow(element - m[i][j], 2)
                })
            })

            angles.push({angles: [alpha, beta, gamma], error: error})
        })
    })


    // Choose angles with smallest differences to the input matrix
    return angles.reduce((prev, curr) => {
        return prev.error < curr.error ? prev : curr
    }).angles
}

function getBlender4x4Matrix() {
    let m = calcResults.worldTransform.inverse.transpose
    m.matrix.push(calcResults.location)
    m = m.transpose
    m.matrix.push([0, 0, 0, 1])


    return `C.scene.camera.matrix_world = Matrix(${JSON.stringify(m.matrix).replace(/\[/g, "(").replace(/\]/g, ")")})`
}

function getBlenderCommand() {
    return `${calcResults.blender4x4Matrix}\r\nC.scene.camera.data.lens = ${calcResults.focalLength}\r\n\r\n`
}

let calcResults = {}

function calculate() {
    let right = document.getElementById("results")
    right.hidden = true

    let axis1 = document.getElementById("axis1").value
    let axis2 = document.getElementById("axis2").value

    window.calcResults = {}
    calcResults.vanishingPoints = getVanishingPoints()
    calcResults.sensorLength = Math.max(document.getElementById("sensor-width").value, document.getElementById("sensor-height").value)
    calcResults.focalLength = getFocalLength()
    calcResults.fov = 2 * Math.atan(calcResults.sensorLength / 2 / calcResults.focalLength) / Math.PI * 180

    if (calcResults.focalLength && axis1[1] !== axis2[1]) {
        right.hidden = false
        calcResults.worldTransform = getWorldTransform()
        calcResults.location = getLocation()
        calcResults.eulerRotation = getEulerRotation().map(x => x / Math.PI * 180)

        calcResults.blender4x4Matrix = getBlender4x4Matrix()
        document.getElementById("location-x").innerText = calcResults.location[0]
        document.getElementById("location-y").innerText = calcResults.location[1]
        document.getElementById("location-z").innerText = calcResults.location[2]

        document.getElementById("rotation-x").innerText = calcResults.eulerRotation[0]
        document.getElementById("rotation-y").innerText = calcResults.eulerRotation[1]
        document.getElementById("rotation-z").innerText = calcResults.eulerRotation[2]

        document.getElementById("blender-command").value = getBlenderCommand()
    }




    document.getElementById("focal-length").innerText = calcResults.focalLength
    document.getElementById("fov").innerText = calcResults.fov
}

/**
 * Projects a point to the UV plane.
 * @param {number[]} vector The vector to project, with coordinates relative to the camera. (x is right, y is forwards and z is up)
 */
function projectPointLocal(vector) {
    let c = -calcResults.focalLength / calcResults.sensorLength * 2 / vector[2]
    let v = Vector.scalarMultiplication(vector, c)
    return [v[0], v[1]]
}

function projectPointLocalInverse(uv, distance) {
    let c = calcResults.sensorLength / calcResults.focalLength / 2 * distance
    let v = Vector.scalarMultiplication(uv, c)
    return [v[0], v[1], -distance]
}

function drawAxisLines() {
    let axes = calcResults.worldTransform.transpose.matrix
    
    let distance = 10 * calcResults.focalLength / calcResults.sensorLength


    let start = projectPointLocalInverse(origin, distance)
    let startUV = projectPointLocal(start)
    for (const i in axes) {
        let axis = axes[i]
        let end = Vector.addition(start, axis)
        let color = axisColors["xyz"[i]]

        let endUV = projectPointLocal(end)
        drawLineUV(...startUV, ...endUV, color, 2)
    }

    
}


const pointRadius = 3

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    
    
    let axis1 = document.getElementById("axis1").value
    let axis2 = document.getElementById("axis2").value
    
    
    
    if (img.src !== "") {
        
        let size = imgCanvasSize()
        
        let pos = UVToPixelsAbsolute(0, 0)
        pos[0] -= size[0] / 2
        pos[1] -= size[1] / 2
        
        ctx.drawImage(img, ...pos, ...size)
        
        // ctx.fillStyle = "#1117"
        ctx.fillStyle = "rgba(17, 17, 17, 0.47)"
        ctx.beginPath()
        ctx.rect(0, 0, canvas.width, canvas.height)
        ctx.fill()
        
        if (calcResults.focalLength) drawAxisLines();
        
        
        let color1 = axisColors[axis1.replace("-", " ").substring(1)]
        let color2 = axisColors[axis2.replace("-", " ").substring(1)]
        
        
        for (const i in corners) {
            let corner = corners[i]
            let center = corner.uvCenter
            let point1 = corner.point1
            let point2 = corner.point2
            
            let centerPx = UVToPixelsAbsolute(...center)
            let point1Px = UVToPixelsAbsolute(...point1)
            let point2Px = UVToPixelsAbsolute(...point2)
            
            ctx.lineWidth = 1.5
            
            drawLineUV(...center, ...point1, color1)
            drawLineUV(...center, ...point2, color2)
            
            if (calcResults) {
                drawLineUV(...center, ...calcResults.vanishingPoints[0], color1, 1)
                drawLineUV(...center, ...calcResults.vanishingPoints[1], color2, 1)
                
            }
            
            // Center point
            drawCircle(...centerPx, pointRadius, "#ffffff")
            drawCircle(...point1Px, pointRadius, color1)
            drawCircle(...point2Px, pointRadius, color2)
        }
        
        let originPx = UVToPixelsAbsolute(...origin)
        
        drawCircle(...originPx, 4, "#ccc")
    }
}

canvas.addEventListener("mousedown", event => {
    if (img.src !== "") {
        let start = pixelsToUVAbsolute(event.offsetX, event.offsetY)
    
        if (event.button === 1 || event.ctrlKey || event.shiftKey) {
            // Translation of the image
            event.preventDefault()
    
            function moveImage(event) {
                let newPoint = pixelsToUVAbsolute(event.offsetX, event.offsetY)
                imageOffset[0] += newPoint[0] - start[0]
                imageOffset[1] += newPoint[1] - start[1]
                draw()
            }
    
            function removeListeners() {
                canvas.removeEventListener("mousemove", moveImage)
                canvas.removeEventListener("mouseup", removeListeners)
            }
    
            canvas.addEventListener("mousemove", moveImage)
            canvas.addEventListener("mouseup", removeListeners)


        } else {
            // Translation of points
            let points = [origin].concat(corners[0].points).concat(corners[1].points)
            let closest = closestPoint(start, points)

            // Closest point is closer than 16 pixels
            if (UVToPixelsRelative(distanceToPoint(start, closest), 0)[0] < 16) {
    
                function movePoint(event) {
                    let newPoint = pixelsToUVAbsolute(event.offsetX, event.offsetY)
                    closest[0] = newPoint[0]
                    closest[1] = newPoint[1]
                    refresh()
                }
    
                function removeListeners() {
                    canvas.removeEventListener("mousemove", movePoint)
                    canvas.removeEventListener("mouseup", removeListeners)
                }
        
                canvas.addEventListener("mousemove", movePoint)
                canvas.addEventListener("mouseup", removeListeners)

            }
        }
    }
})

canvas.addEventListener("wheel", e => {
    e.preventDefault()
    if (e.deltaY) {
        let length = 0.1 * (-e.deltaY / Math.abs(e.deltaY))

        zoomRatio *= Math.exp(length)
        draw()
    }
})


/**
 * Updates the other sensor dimension such that the sensor and the image have the same aspect ratio.
 * If no argument is passed into the function, it will assign the longer of the sensor dimensions to the longer side of the image.
 * @param {number} deciding Which is the constant measurement - 0 for width, 1 for height.
 */
function updateSensorSize(deciding=null) {

    let swInput = document.getElementById("sensor-width")
    let shInput = document.getElementById("sensor-height")

    let sensorWidth = Number(swInput.value)
    let sensorHeight = Number(shInput.value)

    let aspectRatio = img.naturalWidth / img.naturalHeight
    

    // Could probably be done better, but it works.
    if (deciding === null) {
        deciding = aspectRatio > 1 ? 0 : 1
        let longest = Math.max(sensorHeight, sensorWidth)

        if (deciding === 0) {
            swInput.value = longest
            shInput.value = longest / aspectRatio
        } else {
            shInput.value = longest
            swInput.value = longest * aspectRatio
        }
    } else {
        if (deciding === 0) {
            shInput.value = sensorWidth / aspectRatio
        } else {
            swInput.value = sensorHeight * aspectRatio
        }
    }

    calculate()
}


function loadDropped(event) {
    event.preventDefault()
    let item = event.dataTransfer.items[0]
    if (item.type.split("/")[0].toLowerCase() === "image") {
        let file = item.getAsFile()
        uploadImage(file)
    }
}


function refresh() {
    calculate()
    draw()
}

function triggerUpload() {
    document.getElementById("image-file").click()
}



function uploadImage(file) {
    if (file) {
        document.getElementsByTagName("aside")[0].hidden = false
        document.getElementById("canvas-container").removeAttribute("onclick")
        document.getElementById("upload").style.visibility = "hidden"
        
        img.src = URL.createObjectURL(file)
        img.onload = () => {
            updateSensorSize()
            resizeCanvas()
        }
    }
}

resizeCanvas()

document.querySelectorAll(".value, .values span").forEach(elem => {
    elem.onclick = (event) => {
        console.log(event)
        navigator.clipboard.writeText(elem.innerText)
    }
    elem.title = "Copy"
})
