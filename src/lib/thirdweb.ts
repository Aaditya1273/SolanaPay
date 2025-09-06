import { createThirdwebClient } from "thirdweb";

// Replace with your actual client ID from thirdweb dashboard
export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "your-client-id-here",
});