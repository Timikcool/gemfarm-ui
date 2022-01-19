import type { NextPage } from 'next';
import { WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Head from 'next/head';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Center, Container, Heading, Text, VStack, Link, Flex, Box, Stack, Button, useColorMode, HStack } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useFarm } from '../src/contexts/farm.context';
import { useEffect, useRef } from 'react';
import { PublicKey } from '@solana/web3.js'
import { Vault } from '../src/components/Vault'
import { stringifyPKsAndBNs } from '../src/common/gem-common/types';
import { initGemFarm } from '../src/common/gem-farm';

const Home: NextPage = () => {
    const { connected, publicKey, wallet } = useWallet()
    const { connection } = useConnection();
    const { colorMode, toggleColorMode } = useColorMode();
    // const { fetchFarmer, setSelectedNFTs, initFarmer } = useFarm()

    let gf: any;
    // watch([wallet, cluster], async () => {
    //     await freshStart();
    // });

    //needed in case we switch in from another window
    // onMounted(async () => {
    //   await freshStart();
    // });
    useEffect(() => { }, [])

    // --------------------------------------- farmer details
    const farm = useRef<string>();
    const farmAcc = useRef<any>();

    const farmerIdentity = useRef<string>();
    const farmerAcc = useRef<any>();
    const farmerState = useRef<string>();

    const availableA = useRef<string>();
    const availableB = useRef<string>();

    //auto loading for when farm changes
    // watch(farm, async () => {
    //     await freshStart();
    // });

    const updateAvailableRewards = async () => {
        availableA.current = farmerAcc.current.rewardA.accruedReward
            .sub(farmerAcc.current.rewardA.paidOutReward)
            .toString();
        availableB.current = farmerAcc.current.rewardB.accruedReward
            .sub(farmerAcc.current.rewardB.paidOutReward)
            .toString();
    };

    const fetchFarn = async () => {
        farmAcc.current = await gf.fetchFarmAcc(new PublicKey(farm.current!));
        console.log(
            `farm found at ${farm.current}:`,
            stringifyPKsAndBNs(farmAcc.current)
        );
    };

    const fetchFarmer = async () => {
        const [farmerPDA] = await gf.findFarmerPDA(
            new PublicKey(farm.current!),
            publicKey
        );
        farmerIdentity.current = publicKey?.toBase58();
        farmerAcc.current = await gf.fetchFarmerAcc(farmerPDA);
        farmerState.current = gf.parseFarmerState(farmerAcc.current);
        await updateAvailableRewards();
        console.log(
            `farmer found at ${farmerIdentity.current}:`,
            stringifyPKsAndBNs(farmerAcc.current)
        );
    };

    const freshStart = async () => {
        if (publicKey && connected) {
            gf = await initGemFarm(connection, wallet!);
            farmerIdentity.current = publicKey?.toBase58();

            //reset stuff
            farmAcc.current = undefined;
            farmerAcc.current = undefined;
            farmerState.current = undefined;
            availableA.current = undefined;
            availableB.current = undefined;

            try {
                await fetchFarn();
                await fetchFarmer();
            } catch (e) {
                console.log(`farm with PK ${farm.current} not found :(`);
            }
        }
    };

    const initFarmer = async () => {
        await gf.initFarmerWallet(new PublicKey(farm.current!));
        await fetchFarmer();
    };

    // --------------------------------------- staking
    const beginStaking = async () => {
        await gf.stakeWallet(new PublicKey(farm.current!));
        await fetchFarmer();
        selectedNFTs.current = [];
    };

    const endStaking = async () => {
        await gf.unstakeWallet(new PublicKey(farm.current!));
        await fetchFarmer();
        selectedNFTs.current = [];
    };

    const claim = async () => {
        await gf.claimWallet(
            new PublicKey(farm.current!),
            new PublicKey(farmAcc.current.rewardA.rewardMint!),
            new PublicKey(farmAcc.current.rewardB.rewardMint!)
        );
        await fetchFarmer();
    };


    // --------------------------------------- adding extra gem
    const selectedNFTs = useRef<any[]>([]);

    const addSingleGem = async (
        gemMint: PublicKey,
        gemSource: PublicKey,
        creator: PublicKey
    ) => {
        await gf.flashDepositWallet(
            new PublicKey(farm.current!),
            '1',
            gemMint,
            gemSource,
            creator
        );
        await fetchFarmer();
    };

    const addGems = async () => {
        await Promise.all(
            selectedNFTs.current.map((nft) => {
                const creator = new PublicKey(
                    //todo currently simply taking the 1st creator
                    (nft.onchainMetadata as any).data.creators[0].address
                );
                console.log('creator is', creator.toBase58());

                addSingleGem(nft.mint, nft.pubkey!, creator);
            })
        );
        console.log(
            `added another ${selectedNFTs.current.length} gems into staking vault`
        );
    };



    const handleRefreshFarmer = async () => {
        await fetchFarmer();
    };


    if (!connected) {
        return (
            <Container maxWidth="100%" h="100vh" centerContent>
                <Center h="100%">
                    <VStack spacing={8}
                    >
                        <Heading as='h3' size='xl'>
                            Stake you thugbirdz to receive rewards in $BREAD
                        </Heading>
                        <WalletMultiButton />
                        <Text as='cite'>Brought to you by{' '}<Link color='teal.500' href='https://gemworks.gg' isExternal>
                            gemworks
                        </Link>{' '}and{' '}<Link color='red.500' href='https://frakt.art' isExternal>
                                frakt
                            </Link></Text>
                    </VStack>
                </Center>
            </Container >
        )
    }

    if (!farmerAcc.current) {
        <Container maxWidth="100%" h="100vh" centerContent>
            <Center h="100%">
                <VStack spacing={8}
                >
                    <Heading as='h3' size='xl'>
                        Create account to start farming
                    </Heading>
                    <Button onClick={initFarmer}>
                        Create
                    </Button>
                </VStack>
            </Center>
        </Container >
    }

    if (farmerAcc.current) {
        <Container maxWidth="100%" h="100vh" centerContent>
            <Center h="100%">
                <VStack spacing={8}
                >
                    <Vault vault={farmerAcc.current.vault.toBase58()} setSelectedNfts={(nfts) => selectedNFTs.current = nfts} />
                </VStack>
            </Center>
        </Container >
    }

    return <Container maxW="100%">
        <Box px={4}>
            <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
                <HStack spacing={8}>
                    <Center h="48px" w="48px">
                        <img src="https://pbs.twimg.com/profile_images/1448769972562501636/jM8Na3FI_400x400.jpg" />
                    </Center>

                    <Text>
                        thugbirdz staking
                    </Text>
                </HStack>

                <Flex alignItems={'center'}>
                    <Stack direction={'row'} spacing={7}>
                        <Button onClick={toggleColorMode}>
                            {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
                        </Button>

                        <HStack>

                            <WalletMultiButton className='chakra-button' />
                            <WalletDisconnectButton className='chakra-button' />
                        </HStack>
                    </Stack>
                </Flex>
            </Flex>
        </Box>
    </Container>

};

export default Home;
