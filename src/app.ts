import { FlockSDF } from './flockSDF'
import { Flock } from './flock'
import { GameOfLife } from './gameOfLife'
import { PerlinNoise } from './perlinNoise';

export class GPUApp {
  private context: GPUCanvasContext | null = null;
  private device: GPUDevice | undefined;
  private canvas: HTMLCanvasElement;
  private format: GPUTextureFormat | undefined;
 

  constructor(){
    this.canvas = document.querySelector("canvas#webgpuApp") as HTMLCanvasElement;
  }

  

  public init(){
        
        const id:number = 2;
        switch (id){
            case 1: {
                const game = new GameOfLife();
                game?.init(this.canvas).then(()=>{
                    game.start()
                })
            }
            break;
            case 2: {
                const game = new PerlinNoise(this.canvas);
            }
            break;
            default: {
                const game = new Flock();
            }
        }
    }
}



