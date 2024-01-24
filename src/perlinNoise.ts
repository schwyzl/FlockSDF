import * as THREE from 'three';
import { texture, textureStore, tslFn, uvec2, float, vec4, instanceIndex, MeshBasicNodeMaterial, ComputeNode } from 'three/nodes';

import WebGPU from 'three/addons/capabilities/WebGPU.js';
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js';
import StorageTexture from 'three/examples/jsm/renderers/common/StorageTexture.js';
import { rightNow } from "./utils";
import * as Nodes from 'three/nodes';
import perlinNoise from './perlinNoise.fs.glsl'

import GLSLDecoder from 'three/examples/jsm/transpiler/GLSLDecoder.js';
import Transpiler from 'three/examples/jsm/transpiler/Transpiler.js';
import TSLEncoder from 'three/examples/jsm/transpiler/TSLEncoder.js';
import WGSLNodeBuilder from 'three/examples/jsm/renderers/webgpu/nodes/WGSLNodeBuilder.js';



export class PerlinNoise {
    private camera: THREE.Camera;
    private scene: THREE.Scene;
    private renderer: WebGPURenderer;


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
    private computeNode: ComputeNode;

    constructor(canvas: HTMLCanvasElement){
        if ( WebGPU.isAvailable() === false ) {

            document.body.appendChild( WebGPU.getErrorMessage() );

            throw new Error( 'No WebGPU support' );
        }

        const targetFramerate = 60;
        this.maxDeltaTime = 1.0 / targetFramerate;

        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.OrthographicCamera( - aspect, aspect, 1, - 1, 0, 2 );
        this.camera.position.z = 1;

        this.scene = new THREE.Scene();

        // texture

        const width = 512, height = 512;


        const decoder = new GLSLDecoder();
        const encoder = new TSLEncoder();

        const transpiler = new Transpiler( decoder, encoder );
        const tsl = transpiler.parse( perlinNoise );
        // console.log(tsl);
        const tslCode = `let output = null;\n${ tsl }\nreturn { output };`;
        const nodes = new Function( 'THREE', 'TSL', tslCode )( THREE, Nodes );

        // const material = new Nodes.NodeMaterial();
        // material.fragmentNode = nodes.output;
        // material.needsUpdate = true;


        // let NodeBuilder = WGSLNodeBuilder;
        // nodeBuilder = new NodeBuilder( mesh, renderer );
        // nodeBuilder.build();

        // const storageTexture = new StorageTexture( width, height );
        // //storageTexture.minFilter = THREE.LinearMipMapLinearFilter;

        // // create function

        // const computeTexture = tslFn( ( { storageTexture }: StorageTexture ) => {

        //     const posX = instanceIndex.remainder( width );
        //     const posY = instanceIndex.div( width );
        //     const indexUV = uvec2( posX, posY );

        //     // https://www.shadertoy.com/view/Xst3zN

        //     const x = float( posX ).div( 50.0 );
        //     const y = float( posY ).div( 50.0 );

        //     const v1 = x.sin();
        //     const v2 = y.sin();
        //     const v3 = x.add( y ).sin();
        //     const v4 = x.mul( x ).add( y.mul( y ) ).sqrt().add( 5.0 ).sin();
        //     const v = v1.add( v2, v3, v4 );

        //     const r = v.sin();
        //     const g = v.add( Math.PI ).sin();
        //     const b = v.add( Math.PI ).sub( 0.5 ).sin();

        //     textureStore( storageTexture, indexUV, vec4( r, g, b, 1 ) );

        // } );

        // compute

        // this.computeNode = computeTexture( { storageTexture } ).compute( width * height );

        // const material = new MeshBasicNodeMaterial( { color: 0x00ff00 } );
        // material.colorNode = texture( storageTexture );

        // const plane = new THREE.Mesh( new THREE.PlaneGeometry( 1, 1 ), material );
        // this.scene.add( plane );

        // this.renderer = new WebGPURenderer( { antialias: true, canvas } );
        // this.renderer.setPixelRatio( window.devicePixelRatio );
        // this.renderer.setSize( window.innerWidth, window.innerHeight );
        // // compute texture
        // this.renderer.compute( this.computeNode );


        window.addEventListener( 'resize', this.onWindowResize.bind(this) );

        this.start();
    }

    public start(){
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

    private onWindowResize() {

        const camera = (this.camera as THREE.OrthographicCamera);
        this.renderer.setSize( window.innerWidth, window.innerHeight );

        const aspect = window.innerWidth / window.innerHeight;

        const frustumHeight = camera.top - camera.bottom;

        camera.left = - frustumHeight * aspect / 2;
        camera.right = frustumHeight * aspect / 2;

        camera.updateProjectionMatrix();

        this.draw();

    }

    private update(){
        this.renderer.compute( this.computeNode );

    }

    private draw() {

        this.renderer.setClearColor(0xff0000);
        this.renderer.clearColor();

        this.renderer.render( this.scene, this.camera );

    }



}