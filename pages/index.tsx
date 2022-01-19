import type { NextPage } from 'next';
import { WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Head from 'next/head';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import { useWallet } from '@solana/wallet-adapter-react';
import { Center, Container, Heading, Text, VStack, Link, Flex, Box, Stack, Button, useColorMode, HStack } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useFarm } from '../src/contexts/farm.context';

const Home: NextPage = () => {
    const { connected, publicKey } = useWallet()
    const { colorMode, toggleColorMode } = useColorMode();
    const { fetchFarmer, setSelectedNFTs, initFarmer } = useFarm()

    

    const handleRefreshFarmer = async () => {
        await fetchFarmer();
    };

    const handleNewSelectedNFT = (newSelectedNFTs) => {
        console.log(`selected ${newSelectedNFTs.length} NFTs`);
        setSelectedNFTs(newSelectedNFTs);
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

    if (!farmerAcc) {
        <Container maxWidth="100%" h="100vh" centerContent>
            <Center h="100%">
                <VStack spacing={8}
                >
                    <Heading as='h3' size='xl'>
                        Create account to start farming
                    </Heading>
                    <Button onClick={() => initFarmer()}>
                        Create
                    </Button>
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
