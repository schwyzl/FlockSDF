export class Flock {
    private workgroupSize: number;
    private device: GPUDevice;
    private context: GPUCanvasContext;
    private textureFormat: GPUTextureFormat;

    constructor(opt: {device: GPUDevice, context: GPUCanvasContext, textureFormat: GPUTextureFormat, workgroupSize:number} ){
        ({ device: this.device, context: this.context, textureFormat: this.textureFormat, workgroupSize: this.workgroupSize } = opt);
    }

    public start(){

    }


    // private initialiseUniforms()
    // {
    //     auto camera = Cameras::get("Camera");
    //     m_flockingUniforms = Uniforms<FlockingData>::create();

    //     // Create a uniform buffer that describes the grid.
    //     const uniformArray = new Float32Array([this.gridSize, this.gridSize]);
    //     const uniformBuffer = this.device.createBuffer({
    //     label: "Camera Uniforms",
    //     size: uniformArray.byteLength,
    //     usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.,
    //     });
    //     this.device.queue.writeBuffer(uniformBuffer, /*bufferOffset=*/0, uniformArray);
        

    //     Shaders::get("flock")->addUniformBlock(camera->getUniformBlock(), 2, "CameraBlock");
    //     Shaders::get("flock.cs")->addUniformBlock(camera->getUniformBlock(), 2, "CameraBlock");
    //     Shaders::get("ortho.sdftexture")->addUniformBlock(camera->getUniformBlock(), 2, "CameraBlock");
    //     Shaders::get("ubo.constant")->addUniformBlock(camera->getUniformBlock(), 2, "CameraBlock");
    //     Shaders::get("ortho.texture")->addUniformBlock(camera->getUniformBlock(), 2, "CameraBlock");

    //     auto flockingData = FlockingData();
    //     flockingData.mouseButtonDown = false;

    //     m_flockingBlock = UBO<FlockingData>::create("flockingUniforms", GL_DYNAMIC_COPY);
    //     Shaders::get("flock")->addUniformBlock(m_flockingBlock, 3, "FlockingBlock", flockingData);
    //     Shaders::get("flock.cs")->addUniformBlock(m_flockingBlock, 3, "FlockingBlock");
    //     Shaders::get("ortho.sdftexture")->addUniformBlock(m_flockingBlock, 3, "FlockingBlock");

    //     m_reloadGoal = ConstantSpringGoalAnimVar<float>::create();
    //     m_reloadGoal->setGoal(1.0f);
    //     m_reloadGoal->setSpeed(2.0f);

    //     camera->lookAt(Config::get<vec3>("/Camera/interest/value"));
    //     camera->update();

    // }
}