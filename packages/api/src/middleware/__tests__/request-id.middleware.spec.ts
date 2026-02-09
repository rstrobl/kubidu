import { RequestIdMiddleware } from '../request-id.middleware';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should generate a new request ID if not provided', () => {
    middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockRequest.requestId).toBeDefined();
    expect(typeof mockRequest.requestId).toBe('string');
    expect(mockRequest.requestId.length).toBeGreaterThan(0);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      mockRequest.requestId,
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use existing request ID from header', () => {
    const existingRequestId = 'existing-request-id-123';
    mockRequest.headers['x-request-id'] = existingRequestId;

    middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockRequest.requestId).toBe(existingRequestId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      existingRequestId,
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next function', () => {
    middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should set X-Request-ID response header', () => {
    middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      expect.any(String),
    );
  });
});
