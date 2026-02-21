type QaRouteAccessInput = {
  nodeEnv: string | undefined;
  qaEnabledInProduction: boolean;
  qaRouteToken: string;
  queryToken: string | null;
  headerToken: string | null;
};

export const canAccessQaRoute = ({
  nodeEnv,
  qaEnabledInProduction,
  qaRouteToken,
  queryToken,
  headerToken,
}: QaRouteAccessInput): boolean => {
  if (nodeEnv !== "production") {
    return true;
  }

  if (!qaEnabledInProduction) {
    return false;
  }

  if (!qaRouteToken) {
    return true;
  }

  return queryToken === qaRouteToken || headerToken === qaRouteToken;
};
