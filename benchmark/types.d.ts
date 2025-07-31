declare module 'dlxlib' {
  export function solve(
    matrix: number[][],
    solution?: any,
    options?: any,
    maxSolutions?: number
  ): any[]
}

declare module 'dance' {
  export function solve(matrix: number[][], options?: { maxSolutions?: number }): any[]
}

declare module 'dancing-links-algorithm' {
  export function solve(matrix: number[][]): any[]
}
