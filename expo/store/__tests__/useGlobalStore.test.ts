import { useGlobalStore } from '../useGlobalStore';

describe('useGlobalStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGlobalStore.setState({ session: null, user: null, region: null });
  });

  describe('initial state', () => {
    it('starts with null session', () => {
      expect(useGlobalStore.getState().session).toBeNull();
    });

    it('starts with null user', () => {
      expect(useGlobalStore.getState().user).toBeNull();
    });

    it('starts with null region', () => {
      expect(useGlobalStore.getState().region).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no session', () => {
      expect(useGlobalStore.getState().isAuthenticated()).toBe(false);
    });

    it('returns true when session has user', () => {
      useGlobalStore.setState({
        session: { user: { id: 'test' } } as any
      });
      expect(useGlobalStore.getState().isAuthenticated()).toBe(true);
    });
  });

  describe('setSession', () => {
    it('updates session and user', () => {
      const mockSession = { user: { id: 'user-1', email: 'test@test.com' } } as any;
      useGlobalStore.getState().setSession(mockSession);
      
      expect(useGlobalStore.getState().session).toBe(mockSession);
      expect(useGlobalStore.getState().user).toBe(mockSession.user);
    });

    it('clears user when session is null', () => {
      useGlobalStore.getState().setSession(null);
      expect(useGlobalStore.getState().user).toBeNull();
    });
  });

  describe('setRegion', () => {
    it('updates region', () => {
      useGlobalStore.getState().setRegion('es-CL');
      expect(useGlobalStore.getState().region).toBe('es-CL');
    });
  });
});
