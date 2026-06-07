declare module 'ngeohash' {
  interface DecodedResult {
    latitude: number
    longitude: number
    error: { latitude: number; longitude: number }
  }

  function encode(latitude: number, longitude: number, precision?: number): string
  function decode(hashstring: string): DecodedResult
  function decode_bbox(hashstring: string): [number, number, number, number]
  function neighbor(hashstring: string, direction: [number, number]): string
  function neighbors(hashstring: string): string[]
  function bboxes(minlat: number, minlon: number, maxlat: number, maxlon: number, precision?: number): string[]

  export { encode, decode, decode_bbox, neighbor, neighbors, bboxes }
}
