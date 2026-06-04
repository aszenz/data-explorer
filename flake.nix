{
  description = "Data explorer";

  inputs = {
    nixpkgs = {
      url = "github:nixos/nixpkgs?ref=nixos-unstable";
    };
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, flake-compat }:
    let
    # System types to support.
    supportedSystems = [ "x86_64-linux" "x86_64-darwin" "aarch64-linux" "aarch64-darwin" ];
    # Helper function to generate an attrset '{ x86_64-linux = f "x86_64-linux"; ... }'.
    forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    # Nixpkgs instantiated for supported system types.
    nixpkgsFor = forAllSystems
      (system: import nixpkgs {
        inherit system;
        config = { allowUnfree = true; };
      });
    in {

    devShells = forAllSystems (system:
      let
        pkgs = nixpkgsFor.${system};
        nix-browsers = nixpkgsFor.${system}.playwright-driver.browsers;
      in
      {
        default = pkgs.mkShell {
          buildInputs = [ pkgs.nodejs_24 ];
          shellHook = ''
            # Use the Playwright browsers shipped by nixpkgs. The pinned
            # @playwright/test version in package.json must match
            # playwright-driver (${pkgs.playwright-driver.version}) so the
            # expected browser revisions line up.
            export PLAYWRIGHT_BROWSERS_PATH="${nix-browsers}"
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
          '';
        };
      }
    );
  };
}
