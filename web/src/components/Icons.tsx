export function SunIcon() {
  return (
    <svg className="icon icon-sun" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4"></circle>
      <line x1="12" y1="2" x2="12" y2="4"></line>
      <line x1="12" y1="20" x2="12" y2="22"></line>
      <line x1="4.2" y1="4.2" x2="5.6" y2="5.6"></line>
      <line x1="18.4" y1="18.4" x2="19.8" y2="19.8"></line>
      <line x1="2" y1="12" x2="4" y2="12"></line>
      <line x1="20" y1="12" x2="22" y2="12"></line>
      <line x1="4.2" y1="19.8" x2="5.6" y2="18.4"></line>
      <line x1="18.4" y1="5.6" x2="19.8" y2="4.2"></line>
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg className="icon icon-moon" viewBox="0 0 24 24">
      <path d="M21 12.5A8.5 8.5 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5Z"></path>
    </svg>
  );
}

export function BuildingIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24">
      <rect x="4" y="2" width="16" height="20" rx="2"></rect>
      <line x1="9" y1="8" x2="9" y2="8"></line>
      <line x1="15" y1="8" x2="15" y2="8"></line>
      <line x1="9" y1="13" x2="9" y2="13"></line>
      <line x1="15" y1="13" x2="15" y2="13"></line>
      <line x1="9" y1="18" x2="15" y2="18"></line>
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4"></circle>
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"></path>
    </svg>
  );
}

export function LogoutIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  );
}
