import { TokenStandard, createV1, mintV1, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { setComputeUnitLimit, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import {
    Umi,
    createSignerFromKeypair,
    generateSigner,
    none,
    percentAmount,
    publicKey,
    signerIdentity,
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bs58 from 'bs58';

@Injectable()
export class PRMTokenService implements OnModuleInit {
    private readonly logger = new Logger(PRMTokenService.name);
    private umi: Umi;
    private rpcPath = 'https://api.mainnet-beta.solana.com';
    private secretKey: string = this.configService.get('TOKEN_WALLET_PRIVATE_KEYS')[1];
    private splTokenAddress: string;

    constructor(private readonly configService: ConfigService) {}

    /**
     * Initialize the PRM token creation module using Metaplex's UMI
     */
    async onModuleInit() {
        this.logger.log(`init modules - metaplex PRM token service`);
        this.umi = createUmi(this.rpcPath).use(mplTokenMetadata());

        const SPLLauncherFirstKeypair = this.umi.eddsa.createKeypairFromSecretKey(bs58.decode(this.secretKey));
        this.umi.use(signerIdentity(createSignerFromKeypair(this.umi, SPLLauncherFirstKeypair)));
    }

    /**
     * Create PRM Token
     */
    async createToPRM() {
        const mint = generateSigner(this.umi);
        console.log(`mint: ${mint.publicKey}`);
        const createResult = await createV1(this.umi, {
            mint: mint,
            name: 'ParariumRium',
            symbol: 'PRM',
            uri: 'https://shdw-drive.genesysgo.net/4boxVFwAqq1aTqppXwM77HUcndX9GGGNjgfBqKpXJ9we/prm.json',
            sellerFeeBasisPoints: percentAmount(0),
            tokenStandard: TokenStandard.Fungible,
            decimals: 9,
            creators: none(),
        })
            .add(setComputeUnitLimit(this.umi, { units: 600_000 }))
            .add(setComputeUnitPrice(this.umi, { microLamports: 50000 }))
            .sendAndConfirm(this.umi);

        console.log(`create token sig - ${bs58.encode(createResult.signature)}`);
        this.splTokenAddress = mint.publicKey;
    }

    /**
     * Mint tokens to an address
     * @param address owner
     * @param amount amount
     */
    async mintToPRM(address: string, amount: number) {
        const mintResult = await mintV1(this.umi, {
            mint: publicKey(this.splTokenAddress),
            authority: this.umi.identity,
            amount: amount * 1000000000,
            tokenOwner: publicKey(address),
            tokenStandard: TokenStandard.Fungible,
        }).sendAndConfirm(this.umi);

        console.log(`mint sig - ${bs58.encode(mintResult.signature)}`);
    }
}
