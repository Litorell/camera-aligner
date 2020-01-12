/**
 * @file Matrix and Vector operations.
 * 
 * @copyright Oscar Litorell 2019
 */


/**
 * Holds an n * m matrix.
 * @property {number} m - The height of the matrix. (read-only)
 * @property {number} n - The width of the matrix. (read-only)
 * @property {Matrix} transpose - The transpose of the matrix. (read-only)
 */
class Matrix {
    /**
     * Is constructed with an array of arrays.
     * @param {number[][]} [matrix] - An array of arrays representing the matrix.
     * @example
     * new Matrix([
     *     [1, 0, 0],
     *     [0, 1, 0],
     *     [0, 0, 1]
     * ]);
     *  
     */
    constructor(matrix) {
        this.matrix = matrix;
    }

    /**
     * Returns a square identity matrix with the given size.
     * @param {number} size 
     */
    static identity(size) {
        let m = Matrix.fromSize(size, size)
        for (let i = 0; i < size; i++) {
            m.matrix[i][i] = 1
        }
        return m
    }
    
    /**
     * Create a matrix with a given width and height, and an optional value to fill the matrix with.
     * @param {number} width - The width (n) of the matrix.
     * @param {number} height - The height (m) of the matrix.
     * @param {number} [value] - The value to fill the matrix with.
     * @returns {Matrix}
     * @example
     * Matrix.fromSize(3, 2, 1);
     * // returns new Matrix([
     * //     [1, 1, 1],
     * //     [1, 1, 1]
     * // ])
     */
    static fromSize(width, height, value=0) {
        let matrix = []
        for (let i = 0; i < height; i++) {
            matrix.push([]);
            for (let j = 0; j < width; j++) {
                matrix[i].push(value)
            }
        }
        return new Matrix(matrix);
    }

    // Height of the matrix
    get m() {
        return this.matrix.length;
    }
    // Width of the matrix
    get n() {
        return this.matrix[0].length;
    }

    get transpose() {
        let n = this.m;
        let m = this.n

        let newMatrix = [];

        for (let y = 0; y < m; y++) {
            newMatrix.push([]);
            for (let x = 0; x < n; x++) {
                newMatrix[y].push(this.matrix[x][y]);
            }
        }
        return new Matrix(newMatrix);
    }

    /**
     * Applies the matrix's transformation to a vector.
     * @param {number[]} vector - The vector to transform
     * @returns {number[]} The transformed vector.
     */
    transformVector(vector) {
        let result = new Array(this.m);
        result.fill(0);

        for (let i = 0; i < result.length; i++) {
            for (let j = 0; j < Math.min(vector.length, this.n); j++) {
                result[i] += this.matrix[i][j] * vector[j];
            }
        }
        return result;
    }

    
    /**
     * Returns a rotation matrix
     * @param {number} axis The axis along which to rotate. (0, 1, 2) for (x, y, z)
     * @param {number} radians 
     */
    static rotation3D(axis, radians) {
        let matrix = Matrix.fromSize(3, 3, 0)
        let m = matrix.matrix
        let s = Math.sin(radians)
        let c = Math.cos(radians)

        m[axis][axis] = 1
        m[(axis + 1) % 3][(axis + 1) % 3] = c
        m[(axis + 2) % 3][(axis + 2) % 3] = c

        m[(axis + 2) % 3][(axis + 1) % 3] = s
        m[(axis + 1) % 3][(axis + 2) % 3] = -s

        return matrix
    }

    /**
     * Matrix multiplication. Multiply two matrices.
     * @param {Matrix} matrix1 - The left matrix.
     * @param {Matrix} matrix2 - The right matrix.
     * @returns {Matrix}
     * 
     * @example
     * let matrix1 = new Matrix([
     *     [0, 1],
     *     [0, 0]
     * ]);
     * let matrix2 = new Matrix([
     *     [0, 0],
     *     [1, 0]
     * ]);
     * Matrix.multiplication(matrix1, matrix2);
     * // returns new Matrix([
     * //     [1, 0],
     * //     [0, 0]
     * // ]);
     */
    static multiplication(matrix1, matrix2) {
        let m = matrix1.matrix.length;
        let n = matrix2.matrix[0].length;
        let result = Matrix.fromSize(n, m);

        for (let i = 0; i < n; i++) {
            let vector = new Array(n);
            for (let j = 0; j < m; j++) {
                vector[j] = matrix2.matrix[j][i];
            }
            vector = matrix1.transformVector(vector);
            for (let j = 0; j < m; j++) {
                result.matrix[j][i] = vector[j];
            }
        }

        return result;
    }

    /**
     * Returns a copy of the matrix.
     */
    get copy() {
        return new Matrix(this.matrix.map(row => row.slice()))
    }

    multiplyRow(row, scalar) {
        this.matrix[row] = this.matrix[row].map(x => x * scalar)
    }

    multiplyAndAdd(from, to, scalar) {
        this.matrix[to] = this.matrix[from].map((val, i) => val * scalar + this.matrix[to][i])
    }

    swap(rowIndex1, rowIndex2) {
        let row1 = this.matrix[rowIndex1]
        let row2 = this.matrix[rowIndex2]

        for (let i = 0; i < this.n; i++) {
            let temp = row1[i]
            row1[i] = row2[i]
            row2[i] = temp
        }
    }

    /**
     * The inverse of a matrix.
     */
    get inverse() {
        let cols = this.n
        let rows = this.m

        if (cols !== rows) return null

        let old = this.copy

        let newMatrix = Matrix.identity(cols)

        // Bottom left corner zeros
        for (let col = 0; col < cols; col++) {
            if (old.matrix[col][col] === 0) {
                for (let i = col; i < cols; i++) {
                    if (old.matrix[i][i] !== 0) {
                        old.swap(i, col)
                        newMatrix.swap(i, col)
                        break
                    }
                }
            }
            let value = old.matrix[col][col]

            old.multiplyRow(col, 1 / value)
            newMatrix.multiplyRow(col, 1 / value)

            for (let row = col + 1; row < rows; row++) {
                let rowValue = old.matrix[row][col]
                old.multiplyAndAdd(col, row, -rowValue)
                newMatrix.multiplyAndAdd(col, row, -rowValue)
            }
        }

        // Top right corner zeros
        for (let col = cols - 1; col > -1; col--) {
            for (let row = col - 1; row > -1; row--) {
                let rowValue = old.matrix[row][col]
                old.multiplyAndAdd(col, row, -rowValue)
                newMatrix.multiplyAndAdd(col, row, -rowValue)
            }
        }

        return newMatrix
    }
}

/**
 * Contains static vector operation methods.
 * @hideconstructor
 */
class Vector extends Array {
    /**
     * Add two vectors.
     * @param {number[]} vector1 
     * @param {number[]} vector2 
     * @returns {number[]}
     */
    static addition(vector1, vector2) {
        let length = Math.max(vector1.length, vector2.length);
        let result = [];
        
        for (let i = 0; i < length; i++) {
            let term1 = vector1[i];
            let term2 = vector2[i];
            if (isNaN(term1)) term1 = 0;
            if (isNaN(term2)) term2 = 0;

            result.push(term1 + term2);
        }

        return result;
    }

    /**
     * Subtract one vector from another.
     * @param {number[]} vector1 - The vector to subtract from.
     * @param {number[]} vector2 - The vector to subtract.
     * @returns {number[]}
     */
    static subtraction(vector1, vector2) {
        let length = Math.max(vector1.length, vector2.length);
        let result = [];
        
        for (let i = 0; i < length; i++) {
            let term1 = vector1[i];
            let term2 = vector2[i];
            if (isNaN(term1)) term1 = 0;
            if (isNaN(term2)) term2 = 0;

            result.push(term1 - term2);
        }

        return result;
    }

    /**
     * Multiply a vector with a constant.
     * @param {number[]} vector
     * @param {number} scalar
     * @returns {number[]}
     */
    static scalarMultiplication(vector, scalar) {
        return vector.map(x => x * scalar);
    }

    /**
     * Returns a vector with a length of 1, colinear to the input vector
     * @param {number[]} vector 
     */
    static normalize(vector) {
        let c = 1 / Math.sqrt(vector.map(x => Math.pow(x, 2)).reduce((prev, curr) => prev + curr))
        return vector.map(x => x * c)
    }

    /**
     * Returns the cross product of two 3-dimensional vectors
     * @param {number[]} vector1 
     * @param {number[]} vector2 
     */
    static crossProduct(vector1, vector2) {
        let newVector = []
        for (let i = 0; i < 3;  i++) {
            newVector.push(vector1[(i + 1) % 3] * vector2[(i + 2) % 3])
            newVector[i] -= (vector1[(i + 2) % 3] * vector2[(i + 1) % 3])
        }
        return newVector
    }

}

