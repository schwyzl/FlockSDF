export class PerlinNoise {
    private workgroupSize: number;
    private device: GPUDevice;
    private context: GPUCanvasContext;
    private textureFormat: GPUTextureFormat;
    private vertices: Float32Array | undefined;
    private vertexBuffer: GPUBuffer | undefined;

    constructor(opt: {device: GPUDevice, context: GPUCanvasContext, textureFormat: GPUTextureFormat, workgroupSize:number} ){
        ({ device: this.device, context: this.context, textureFormat: this.textureFormat, workgroupSize: this.workgroupSize } = opt);
    }

    public start(){
        this.initialisePrimitives();
    }


    private initialisePrimitives(){
        this.vertices = new Float32Array([
            //   X,    Y,
              -0.8, -0.8, // Triangle 1 (Blue)
                0.8, -0.8,
                0.8,  0.8,
            
              -0.8, -0.8, // Triangle 2 (Red)
                0.8,  0.8,
              -0.8,  0.8,
            ]);
            
          this.vertexBuffer = this.device.createBuffer({
            label: "Cell vertices",
            size: this.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
          });
          this.device.queue.writeBuffer(this.vertexBuffer, /*bufferOffset=*/0, this.vertices);
          
          const vertexBufferLayout = {
            arrayStride: 8,
            attributes: [{
              format: "float32x2",
              offset: 0,
              shaderLocation: 0, // Position, see vertex shader
            }],
          };
    }


}