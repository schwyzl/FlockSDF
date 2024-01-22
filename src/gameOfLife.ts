import { rightNow } from "./utils";

export class GameOfLife{
  private gridSize: number;
  private workgroupSize: number;
  private simulationPipeline: GPUComputePipeline;
  private step = 0;
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private vertices: Float32Array;
  private cellPipeline: GPURenderPipeline;
  private bindGroups: GPUBindGroup[];
  private vertexBuffer: GPUBuffer;
  private textureFormat: GPUTextureFormat;

  private time = 0;
  private lastTime = rightNow();
  private prevSecondTime = 0;
  private lag = 0;
  private maxDeltaTime = 0;
  private deltaTime = 0;
  private times: number[] = [];
  private deltas: number[] = [];
  private frames = 0.0;
  private fps: string = '';
  private appRunning = true;
  

  constructor(opt: {device: GPUDevice, context: GPUCanvasContext, textureFormat: GPUTextureFormat, workgroupSize:number, gridSize: number} ){
    ({ device: this.device, context: this.context, textureFormat: this.textureFormat, workgroupSize: this.workgroupSize, gridSize: this.gridSize } = opt);

    const targetFramerate = 10;
    this.maxDeltaTime = 1.0 / targetFramerate;

    
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
    
    const cellShaderModule = this.device.createShaderModule({
      label: "Cell shader",
      code: `
        struct VertexInput {
          @location(0) pos: vec2f,
          @builtin(instance_index) instance: u32,
        };
    
        struct VertexOutput {
          @builtin(position) pos: vec4f,
          @location(0) cell: vec2f,
        };
    
        @group(0) @binding(0) var<uniform> grid: vec2f;
        @group(0) @binding(1) var<storage> cellState: array<u32>; 
    
        @vertex
        fn vertexMain(input: VertexInput) -> VertexOutput
        {
    
          let i = f32(input.instance);
          let cell = vec2f(i % grid.x, floor(i / grid.x));
          let state = f32(cellState[input.instance]);
    
          let cellOffset = cell / grid * 2; // Compute the offset to cell
          let gridPos = (input.pos*state+1) / grid - 1 + cellOffset;
          
          var output: VertexOutput;
          output.pos = vec4f(gridPos, 0, 1);
          output.cell = cell;
          return output;
        }
    
        struct FragInput {
          @location(0) cell: vec2f,
        }
    
        @fragment
        fn fragmentMain(input: FragInput) -> 
        @location(0) vec4f {
          let c = input.cell / grid;
          return vec4f(c, 1-c.x, 1);
        }
      `
    });
    
      // Create the compute shader that will process the simulation.
    const simulationShaderModule = this.device.createShaderModule({
      label: "Game of Life simulation shader",
      code: `
        @group(0) @binding(0) var<uniform> grid: vec2f;
        @group(0) @binding(1) var<storage> cellStateIn: array<u32>;
        @group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;
    
        fn cellIndex(cell: vec2u) -> u32 {
          return (cell.y % u32(grid.y)) * u32(grid.x) +
                  (cell.x % u32(grid.x));
        }
    
        fn cellActive(x: u32, y: u32) -> u32 {
          return cellStateIn[cellIndex(vec2(x, y))];
        }
    
        @compute @workgroup_size(${this.workgroupSize}, ${this.workgroupSize})
        fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
    
          let activeNeighbors = cellActive(cell.x+1, cell.y+1) +
                      cellActive(cell.x+1, cell.y) +
                      cellActive(cell.x+1, cell.y-1) +
                      cellActive(cell.x, cell.y-1) +
                      cellActive(cell.x-1, cell.y-1) +
                      cellActive(cell.x-1, cell.y) +
                      cellActive(cell.x-1, cell.y+1) +
                      cellActive(cell.x, cell.y+1);
    
          let i = cellIndex(cell.xy);
          // Conway's game of life rules:
          switch activeNeighbors {
            case 2u: { // Active cells with 2 neighbors stay active.
              cellStateOut[i] = cellStateIn[i];
            }
            case 3u: { // Cells with 3 neighbors become or stay active.
              cellStateOut[i] = 1u;
            }
            default: { // Cells with < 2 or > 3 neighbors become inactive.
              cellStateOut[i] = 0u;
            }
          }
    
          
        }`
    });
    
    // Create a uniform buffer that describes the grid.
    const uniformArray = new Float32Array([this.gridSize, this.gridSize]);
    const uniformBuffer = this.device.createBuffer({
      label: "Grid Uniforms",
      size: uniformArray.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(uniformBuffer, /*bufferOffset=*/0, uniformArray);
    
    // Create an array representing the active state of each cell.
    const cellStateArray = new Uint32Array(this.gridSize * this.gridSize);
    
    // Create two storage buffers to hold the cell state.
    const cellStateStorage = [
      this.device.createBuffer({
        label: "Cell State A",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      this.device.createBuffer({
        label: "Cell State B",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      })
    ];
    
    // Set each cell to a random state, then copy the JavaScript array 
    // into the storage buffer.
    for (let i = 0; i < cellStateArray.length; ++i) {
      cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
    }
    this.device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);
    
    // Mark every other cell of the second grid as active.
    for (let i = 0; i < cellStateArray.length; i++) {
      cellStateArray[i] = i % 2;
    }
    this.device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);
        
    
    
    // Create the bind group layout and pipeline layout.
    const bindGroupLayout = this.device.createBindGroupLayout({
      label: "Cell Bind Group Layout",
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
        buffer: {} // Grid uniform buffer
      }, {
        binding: 1,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage"} // Cell state input buffer
      }, {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage"} // Cell state output buffer
      }]
    });
    
    const pipelineLayout = this.device.createPipelineLayout({
      label: "Cell Pipeline Layout",
      bindGroupLayouts: [ bindGroupLayout ],
    });
    
    this.cellPipeline = this.device.createRenderPipeline({
      label: "Cell pipeline",
      layout: pipelineLayout,
      vertex: {
        module: cellShaderModule,
        entryPoint: "vertexMain",
        buffers: [vertexBufferLayout]
      },
      fragment: {
        module: cellShaderModule,
        entryPoint: "fragmentMain",
        targets: [{
          format: this.textureFormat
        }]
      }
    });
    
    this.bindGroups = [
      this.device.createBindGroup({
        label: "Cell renderer bind group A",
        layout: bindGroupLayout,
        entries: [{
          binding: 0,
          resource: { buffer: uniformBuffer }
        },
        {
          binding: 1,
          resource: { buffer: cellStateStorage[0] }
        }, {
          binding: 2,
          resource: { buffer: cellStateStorage[1] }
        }],
      }),
      this.device.createBindGroup({
        label: "Cell renderer bind group B",
        layout: bindGroupLayout,
        entries: [{
          binding: 0,
          resource: { buffer: uniformBuffer }
        }, {
          binding: 1,
          resource: { buffer: cellStateStorage[1] }
        }, {
          binding: 2,
          resource: { buffer: cellStateStorage[0] }
        }],
      })
    ];
    
    
    // Create a compute pipeline that updates the game state.
    this.simulationPipeline = this.device.createComputePipeline({
      label: "Simulation pipeline",
      layout: pipelineLayout,
      compute: {
        module: simulationShaderModule,
        entryPoint: "computeMain",
      }
    });
    
  }

  public update() {
    const encoder = this.device.createCommandEncoder();
  
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(this.simulationPipeline);
    computePass.setBindGroup(0, this.bindGroups[this.step % 2]);
    
    const workgroupCount = Math.ceil(this.gridSize / this.workgroupSize);
    computePass.dispatchWorkgroups(workgroupCount, workgroupCount);
    computePass.end();

    this.device.queue.submit([encoder.finish()]);

  }

  public draw(){
    const encoder = this.device.createCommandEncoder();

    // start the render pass
    this.step++; // Increment the step count
  
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0.4, a: 1.0 },
        storeOp: "store",
      }]
    });
    
  
    // Draw the grid.
    pass.setPipeline(this.cellPipeline);
    pass.setBindGroup(0, this.bindGroups[this.step % 2]); // Updated!
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(this.vertices.length / 2, this.gridSize * this.gridSize);
  
    // End the render pass and submit the command buffer
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  } 



  public start(){
    // new FlockSDF(this.device!, this.context!);

    this.mainloop();
  
  }

  private mainloop(){

    const now = rightNow();
    this.deltaTime = (now - this.lastTime) / 1000;
    this.time += this.deltaTime;
    this.lag += this.deltaTime;
    this.lastTime = now;

    // Calculate FPS
    ++this.frames;
    if ( now >= this.prevSecondTime + 1000 ) {

      this.fps = Math.round(( this.frames * 1000 ) / ( now - this.prevSecondTime )).toFixed();
      this.prevSecondTime = now;
      this.frames = 0;

    }

    this.fps && console.log(this.fps);

    if (!this.appRunning) {
        this.lag = 0;
      }
      while (this.lag >= this.maxDeltaTime) {
        while (this.times.length > 0 && this.times[0] <= now - 1000) {
          this.times.shift();
          this.deltas.shift();
        }
        this.times.push(now);
        this.deltas.push(this.deltaTime);
        
        this.update();
        this.draw();

        this.lag -= this.maxDeltaTime;
      }
  
      this.appRunning = true;

    
      requestAnimationFrame(this.mainloop.bind(this));
    
  }
}