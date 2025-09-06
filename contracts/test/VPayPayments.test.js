const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VPayPayments", function () {
  let vPayPayments;
  let owner;
  let user1;
  let user2;
  let operator;

  beforeEach(async function () {
    [owner, user1, user2, operator] = await ethers.getSigners();
    
    const VPayPayments = await ethers.getContractFactory("VPayPayments");
    vPayPayments = await VPayPayments.deploy(owner.address);
    await vPayPayments.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await vPayPayments.owner()).to.equal(owner.address);
    });

    it("Should set initial fee rate to 250 (2.5%)", async function () {
      expect(await vPayPayments.feeRate()).to.equal(250);
    });

    it("Should set fee recipient to owner", async function () {
      expect(await vPayPayments.feeRecipient()).to.equal(owner.address);
    });
  });

  describe("Deposits", function () {
    it("Should allow users to deposit ETH", async function () {
      const depositAmount = ethers.parseEther("1");
      
      await expect(vPayPayments.connect(user1).deposit({ value: depositAmount }))
        .to.emit(vPayPayments, "Deposit")
        .withArgs(user1.address, depositAmount);

      expect(await vPayPayments.balances(user1.address)).to.equal(depositAmount);
    });

    it("Should reject zero deposits", async function () {
      await expect(vPayPayments.connect(user1).deposit({ value: 0 }))
        .to.be.revertedWith("VPayPayments: amount must be positive");
    });

    it("Should update total deposits", async function () {
      const depositAmount = ethers.parseEther("2");
      
      await vPayPayments.connect(user1).deposit({ value: depositAmount });
      expect(await vPayPayments.totalDeposits()).to.equal(depositAmount);
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      // User1 deposits 2 ETH
      await vPayPayments.connect(user1).deposit({ value: ethers.parseEther("2") });
    });

    it("Should allow transfers between users", async function () {
      const transferAmount = ethers.parseEther("1");
      const fee = transferAmount * 250n / 10000n; // 2.5% fee
      const netAmount = transferAmount - fee;

      await expect(vPayPayments.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(vPayPayments, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount, fee);

      expect(await vPayPayments.balances(user1.address)).to.equal(ethers.parseEther("1"));
      expect(await vPayPayments.balances(user2.address)).to.equal(netAmount);
    });

    it("Should reject transfers to zero address", async function () {
      await expect(vPayPayments.connect(user1).transfer(ethers.ZeroAddress, ethers.parseEther("1")))
        .to.be.revertedWith("VPayPayments: invalid recipient");
    });

    it("Should reject transfers with insufficient balance", async function () {
      await expect(vPayPayments.connect(user1).transfer(user2.address, ethers.parseEther("3")))
        .to.be.revertedWith("VPayPayments: insufficient balance");
    });

    it("Should reject zero amount transfers", async function () {
      await expect(vPayPayments.connect(user1).transfer(user2.address, 0))
        .to.be.revertedWith("VPayPayments: amount must be positive");
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      await vPayPayments.connect(user1).deposit({ value: ethers.parseEther("2") });
    });

    it("Should allow users to withdraw their balance", async function () {
      const withdrawAmount = ethers.parseEther("1");
      const fee = withdrawAmount * 250n / 10000n;
      const netAmount = withdrawAmount - fee;

      const initialBalance = await ethers.provider.getBalance(user1.address);

      const tx = await vPayPayments.connect(user1).withdraw(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(user1.address);
      
      expect(finalBalance).to.be.closeTo(
        initialBalance + netAmount - gasUsed,
        ethers.parseEther("0.001") // Allow for small gas variations
      );

      expect(await vPayPayments.balances(user1.address)).to.equal(ethers.parseEther("1"));
    });

    it("Should reject withdrawals with insufficient balance", async function () {
      await expect(vPayPayments.connect(user1).withdraw(ethers.parseEther("3")))
        .to.be.revertedWith("VPayPayments: insufficient balance");
    });

    it("Should reject zero amount withdrawals", async function () {
      await expect(vPayPayments.connect(user1).withdraw(0))
        .to.be.revertedWith("VPayPayments: amount must be positive");
    });
  });

  describe("Fee Management", function () {
    it("Should allow owner to update fee rate", async function () {
      const newFeeRate = 500; // 5%
      
      await expect(vPayPayments.connect(owner).setFeeRate(newFeeRate))
        .to.emit(vPayPayments, "FeeRateUpdated")
        .withArgs(250, newFeeRate);

      expect(await vPayPayments.feeRate()).to.equal(newFeeRate);
    });

    it("Should reject fee rate above 10%", async function () {
      await expect(vPayPayments.connect(owner).setFeeRate(1001))
        .to.be.revertedWith("VPayPayments: fee rate too high");
    });

    it("Should reject fee rate updates from non-owner", async function () {
      await expect(vPayPayments.connect(user1).setFeeRate(500))
        .to.be.revertedWithCustomError(vPayPayments, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to update fee recipient", async function () {
      await expect(vPayPayments.connect(owner).setFeeRecipient(user1.address))
        .to.emit(vPayPayments, "FeeRecipientUpdated")
        .withArgs(owner.address, user1.address);

      expect(await vPayPayments.feeRecipient()).to.equal(user1.address);
    });
  });

  describe("Emergency Functions", function () {
    beforeEach(async function () {
      await vPayPayments.connect(user1).deposit({ value: ethers.parseEther("1") });
    });

    it("Should allow owner to pause contract", async function () {
      await vPayPayments.connect(owner).pause();
      expect(await vPayPayments.paused()).to.be.true;

      await expect(vPayPayments.connect(user1).deposit({ value: ethers.parseEther("1") }))
        .to.be.revertedWithCustomError(vPayPayments, "EnforcedPause");
    });

    it("Should allow owner to emergency withdraw", async function () {
      const contractBalance = await ethers.provider.getBalance(vPayPayments.target);
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

      const tx = await vPayPayments.connect(owner).emergencyWithdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      
      expect(finalOwnerBalance).to.be.closeTo(
        initialOwnerBalance + contractBalance - gasUsed,
        ethers.parseEther("0.001")
      );
    });
  });

  describe("Operator Functions", function () {
    beforeEach(async function () {
      await vPayPayments.connect(owner).addOperator(operator.address);
      await vPayPayments.connect(user1).deposit({ value: ethers.parseEther("2") });
    });

    it("Should allow operators to transfer on behalf of users", async function () {
      const transferAmount = ethers.parseEther("1");
      
      await expect(vPayPayments.connect(operator).operatorTransfer(user1.address, user2.address, transferAmount))
        .to.emit(vPayPayments, "Transfer");

      expect(await vPayPayments.balances(user1.address)).to.equal(ethers.parseEther("1"));
    });

    it("Should reject operator transfers from non-operators", async function () {
      await expect(vPayPayments.connect(user1).operatorTransfer(user1.address, user2.address, ethers.parseEther("1")))
        .to.be.revertedWith("VPayPayments: not an operator");
    });
  });
});
