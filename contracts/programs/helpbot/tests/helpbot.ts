import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanapayHelpbot } from "../target/types/solanapay_helpbot";
import { expect } from "chai";

describe("solanapay-helpbot", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanapayHelpbot as Program<SolanapayHelpbot>;
  const provider = anchor.getProvider();

  let helpbotPda: anchor.web3.PublicKey;
  let helpbotBump: number;

  before(async () => {
    [helpbotPda, helpbotBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("helpbot")],
      program.programId
    );
  });

  it("Initializes the helpbot", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        helpbot: helpbotPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize transaction signature", tx);

    const helpbotAccount = await program.account.helpBot.fetch(helpbotPda);
    expect(helpbotAccount.authority.toString()).to.equal(provider.wallet.publicKey.toString());
    expect(helpbotAccount.totalQueries.toNumber()).to.equal(0);
    expect(helpbotAccount.activeUsers.toNumber()).to.equal(0);
  });

  it("Processes balance query", async () => {
    // Create a mock token account for testing
    const tokenMint = anchor.web3.Keypair.generate();
    const userTokenAccount = anchor.web3.Keypair.generate();

    const tx = await program.methods
      .queryBalance(provider.wallet.publicKey)
      .accounts({
        helpbot: helpbotPda,
        tokenAccount: userTokenAccount.publicKey,
        user: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Balance query transaction signature", tx);

    const helpbotAccount = await program.account.helpBot.fetch(helpbotPda);
    expect(helpbotAccount.totalQueries.toNumber()).to.equal(1);
  });

  it("Processes general question", async () => {
    const question = "What are the fees for SolanaPay?";

    const tx = await program.methods
      .askGeneralQuestion(question)
      .accounts({
        helpbot: helpbotPda,
        user: provider.wallet.publicKey,
      })
      .rpc();

    console.log("General question transaction signature", tx);

    const helpbotAccount = await program.account.helpBot.fetch(helpbotPda);
    expect(helpbotAccount.totalQueries.toNumber()).to.equal(2);
  });

  it("Updates user activity", async () => {
    const [userActivityPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_activity"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .updateUserActivity()
      .accounts({
        helpbot: helpbotPda,
        userActivity: userActivityPda,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("User activity update transaction signature", tx);

    const userActivityAccount = await program.account.userActivity.fetch(userActivityPda);
    expect(userActivityAccount.totalQueries.toNumber()).to.equal(1);
    expect(userActivityAccount.user.toString()).to.equal(provider.wallet.publicKey.toString());
  });
});
