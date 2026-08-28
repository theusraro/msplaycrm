import { envConfig } from '../config/env';
import { AuthRepository, ConfigRepository, DeviceRepository, ProfileRepository } from '../types/repositories';
import { MockAuthRepository, RemoteAuthRepository } from './authRepository';
import { MockConfigRepository, RemoteConfigRepository } from './configRepository';
import { MockDeviceRepository, RemoteDeviceRepository } from './deviceRepository';
import { MockProfileRepository, RemoteProfileRepository } from './profileRepository';
import { contentRepository, ContentRepository } from './contentRepository';

class RepositoryContainer {
  public auth: AuthRepository;
  public config: ConfigRepository;
  public device: DeviceRepository;
  public profile: ProfileRepository;
  public content: ContentRepository;

  constructor() {
    const isRemote = envConfig.USE_REMOTE_BACKEND;

    this.auth = isRemote ? new RemoteAuthRepository() : new MockAuthRepository();
    this.config = isRemote ? new RemoteConfigRepository() : new MockConfigRepository();
    this.device = isRemote ? new RemoteDeviceRepository() : new MockDeviceRepository();
    this.profile = isRemote ? new RemoteProfileRepository() : new MockProfileRepository();
    this.content = contentRepository;
  }
}

export const repositories = new RepositoryContainer();
