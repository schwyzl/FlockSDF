import { FlockSDF } from './flockSDF'
import { GameOfLife } from './gameOfLife'

export class GPUApp {
  private context: GPUCanvasContext | null = null;
  private device: GPUDevice | undefined;
  private canvas: HTMLCanvasElement;
  private format: GPUTextureFormat | undefined;
 

  constructor(){
    this.canvas = document.querySelector("canvas#webgpuApp") as HTMLCanvasElement;
    
  }

  private async setupWebGPU(canvas: HTMLCanvasElement){
    if (!navigator.gpu) {
      throw new Error("WebGPU not supported on this browser.");
    }
    
    const adapter = await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
    if (!adapter) {
      throw new Error("No appropriate GPUAdapter found.");
    }
    
    this.context = canvas.getContext("webgpu");
    this.format = navigator.gpu.getPreferredCanvasFormat();
    
    await adapter.requestDevice().then((device)=> {
      this.device = device;
      (this.context as GPUCanvasContext).configure({
        device,
        format: this.format!,
      });
    });
  }

  public init(){

    this.setupWebGPU(this.canvas).then(()=>{
    const game = new GameOfLife(this.device!, this.context!, this.format!);
    game.start()
    });
  }

}



