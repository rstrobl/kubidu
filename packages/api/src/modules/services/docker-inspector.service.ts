import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

@Injectable()
export class DockerInspectorService {
  private readonly logger = new Logger(DockerInspectorService.name);

  /**
   * Inspect a Docker image and extract the exposed ports
   * @param imageName - The Docker image name (e.g., 'nginx:latest', 'postgres:14')
   * @returns The first exposed port or null if none found
   */
  async getExposedPort(imageName: string): Promise<number | null> {
    try {
      this.logger.log(`Inspecting Docker image: ${imageName}`);

      // Pull the image first to ensure we have the latest metadata
      // Use --quiet to reduce output
      try {
        await execPromise(`docker pull ${imageName} --quiet`, {
          timeout: 60000, // 60 second timeout
        });
      } catch (pullError) {
        this.logger.warn(`Failed to pull image ${imageName}, trying to inspect local image:`, pullError);
      }

      // Inspect the image to get exposed ports
      const { stdout } = await execPromise(
        `docker image inspect ${imageName} --format='{{json .Config.ExposedPorts}}'`,
        { timeout: 10000 }
      );

      const exposedPortsJson = stdout.trim().replace(/^'|'$/g, '');

      if (!exposedPortsJson || exposedPortsJson === 'null' || exposedPortsJson === '{}') {
        this.logger.log(`No exposed ports found in image: ${imageName}`);
        return null;
      }

      // Parse the exposed ports JSON
      // Format is like: {"80/tcp":{}, "443/tcp":{}}
      const exposedPorts = JSON.parse(exposedPortsJson);
      const ports = Object.keys(exposedPorts || {});

      if (ports.length === 0) {
        this.logger.log(`No exposed ports found in image: ${imageName}`);
        return null;
      }

      // Extract the first port number (remove the /tcp or /udp suffix)
      const firstPort = ports[0].split('/')[0];
      const portNumber = parseInt(firstPort, 10);

      if (isNaN(portNumber)) {
        this.logger.warn(`Invalid port number extracted: ${firstPort}`);
        return null;
      }

      this.logger.log(`Found exposed port ${portNumber} in image: ${imageName}`);
      return portNumber;
    } catch (error) {
      this.logger.error(`Failed to inspect Docker image ${imageName}:`, error);
      return null;
    }
  }

  /**
   * Get all exposed ports from a Docker image
   * @param imageName - The Docker image name
   * @returns Array of exposed port numbers
   */
  async getAllExposedPorts(imageName: string): Promise<number[]> {
    try {
      this.logger.log(`Inspecting all ports for Docker image: ${imageName}`);

      // Pull the image first
      try {
        await execPromise(`docker pull ${imageName} --quiet`, {
          timeout: 60000,
        });
      } catch (pullError) {
        this.logger.warn(`Failed to pull image ${imageName}:`, pullError);
      }

      // Inspect the image
      const { stdout } = await execPromise(
        `docker image inspect ${imageName} --format='{{json .Config.ExposedPorts}}'`,
        { timeout: 10000 }
      );

      const exposedPortsJson = stdout.trim().replace(/^'|'$/g, '');

      if (!exposedPortsJson || exposedPortsJson === 'null' || exposedPortsJson === '{}') {
        return [];
      }

      const exposedPorts = JSON.parse(exposedPortsJson);
      const ports = Object.keys(exposedPorts || {})
        .map(portStr => {
          const portNumber = parseInt(portStr.split('/')[0], 10);
          return isNaN(portNumber) ? null : portNumber;
        })
        .filter((port): port is number => port !== null);

      this.logger.log(`Found ${ports.length} exposed ports in image: ${imageName}`);
      return ports;
    } catch (error) {
      this.logger.error(`Failed to inspect Docker image ${imageName}:`, error);
      return [];
    }
  }
}
