import { Matrix4, Vector3 } from 'three';

export interface CameraData {
    view: Matrix4;
    projection: Matrix4;
    orientation: Matrix4;

    position: Vector3;
    up: Vector3;

    nearClip: number;
    farClip: number;
}