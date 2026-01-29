import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar-fs';

@Injectable()
export class DockerService {
  private readonly logger = new Logger(DockerService.name);
  private readonly docker: Docker;
  private readonly registryUrl: string;

  constructor(private readonly configService: ConfigService) {
    const socketPath = this.configService.get<string>('docker.socketPath');
    this.docker = new Docker({ socketPath });
    this.registryUrl = this.configService.get<string>('registry.url');
  }

  async buildImage(
    buildContext: string,
    imageName: string,
    imageTag: string,
  ): Promise<{ imageId: string; logs: string }> {
    this.logger.log(`Building image: ${imageName}:${imageTag}`);

    const fullImageName = `${this.registryUrl}/${imageName}:${imageTag}`;
    const logs: string[] = [];

    // Check if Dockerfile exists
    const dockerfilePath = path.join(buildContext, 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) {
      throw new Error('Dockerfile not found in repository');
    }

    // Create tar stream of build context
    const tarStream = tar.pack(buildContext);

    return new Promise((resolve, reject) => {
      this.docker.buildImage(
        tarStream,
        {
          t: fullImageName,
          buildargs: {},
          labels: {
            'kubidu.managed': 'true',
          },
        },
        (err, stream) => {
          if (err) {
            this.logger.error(`Build error: ${err.message}`);
            return reject(err);
          }

          let imageId: string;

          stream.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(Boolean);

            lines.forEach((line) => {
              try {
                const parsed = JSON.parse(line);

                if (parsed.stream) {
                  logs.push(parsed.stream);
                  process.stdout.write(parsed.stream);
                }

                if (parsed.error) {
                  logs.push(`ERROR: ${parsed.error}`);
                  this.logger.error(`Build error: ${parsed.error}`);
                }

                // Extract image ID
                if (parsed.aux && parsed.aux.ID) {
                  imageId = parsed.aux.ID;
                }
              } catch (parseError) {
                // Ignore parse errors
              }
            });
          });

          stream.on('end', () => {
            if (!imageId) {
              // Try to find the image by tag
              this.docker.getImage(fullImageName).inspect((inspectErr, data) => {
                if (inspectErr) {
                  return reject(new Error('Build completed but image ID not found'));
                }
                imageId = data.Id;
                this.logger.log(`Build completed: ${imageId}`);
                resolve({ imageId, logs: logs.join('') });
              });
            } else {
              this.logger.log(`Build completed: ${imageId}`);
              resolve({ imageId, logs: logs.join('') });
            }
          });

          stream.on('error', (streamError) => {
            this.logger.error(`Stream error: ${streamError.message}`);
            reject(streamError);
          });
        },
      );
    });
  }

  async pushImage(imageName: string, imageTag: string): Promise<void> {
    const fullImageName = `${this.registryUrl}/${imageName}:${imageTag}`;
    this.logger.log(`Pushing image: ${fullImageName}`);

    const image = this.docker.getImage(fullImageName);

    return new Promise((resolve, reject) => {
      image.push({}, (err, stream) => {
        if (err) {
          this.logger.error(`Push error: ${err.message}`);
          return reject(err);
        }

        stream.on('data', (chunk) => {
          const lines = chunk.toString().split('\n').filter(Boolean);
          lines.forEach((line) => {
            try {
              const parsed = JSON.parse(line);
              if (parsed.status) {
                this.logger.debug(`Push: ${parsed.status}`);
              }
              if (parsed.error) {
                this.logger.error(`Push error: ${parsed.error}`);
                reject(new Error(parsed.error));
              }
            } catch (parseError) {
              // Ignore parse errors
            }
          });
        });

        stream.on('end', () => {
          this.logger.log(`Successfully pushed: ${fullImageName}`);
          resolve();
        });

        stream.on('error', (streamError) => {
          this.logger.error(`Push stream error: ${streamError.message}`);
          reject(streamError);
        });
      });
    });
  }

  async removeImage(imageName: string, imageTag: string): Promise<void> {
    try {
      const fullImageName = `${this.registryUrl}/${imageName}:${imageTag}`;
      const image = this.docker.getImage(fullImageName);
      await image.remove({ force: true });
      this.logger.log(`Removed image: ${fullImageName}`);
    } catch (error) {
      this.logger.warn(`Failed to remove image: ${error.message}`);
    }
  }

  async getImageInfo(imageName: string, imageTag: string): Promise<any> {
    const fullImageName = `${this.registryUrl}/${imageName}:${imageTag}`;
    const image = this.docker.getImage(fullImageName);
    return await image.inspect();
  }
}
